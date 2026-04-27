import { Injectable } from '@nestjs/common';
import { CompareOperation, SearchFilterValue } from '../../../output-interfaces/Config';
import { ValidationCompareCondition, ValidationCondition, ValidationConditionalRule, ValidationRule, ValidationWorkflow, WorkflowReportItemLevel, WorkflowType } from '../../../output-interfaces/Workflow';
import { createInvalidRequestHttpException } from '../common/api-error';
import { hasProvidedEntityId } from '../common/entity-id';
import { Publication } from '../publication/core/Publication.entity';
import { PublicationService } from '../publication/core/publication.service';
import { WorkflowReport } from './WorkflowReport.entity';
import { WorkflowReportService } from './workflow-report.service';

type ValidationFinding = {
    level: 'info' | 'warning' | 'error';
    code: string;
    message: string;
};

type CompareEmptyMode = 'ignore' | 'no-match';

export type ValidationSummary = {
    target: string;
    checked: number;
    findings: number;
    info: number;
    warning: number;
    error: number;
};

@Injectable()
export class ValidationService {
    private readonly validationHeartbeatIntervalMs = 30_000;
    private validationDefinition?: ValidationWorkflow;
    private workflowReport?: WorkflowReport;
    protected progress = 0;
    protected status_text = 'initialized';

    constructor(
        private publicationService: PublicationService,
        private workflowReportService: WorkflowReportService,
    ) { }

    async setUp(validationDefinition: ValidationWorkflow) {
        if (!validationDefinition?.target) {
            throw createInvalidRequestHttpException('Validation workflow target is required.');
        }
        if (!validationDefinition.rules?.length) {
            throw createInvalidRequestHttpException('Validation workflow must define at least one rule.');
        }

        this.validationDefinition = validationDefinition;
        this.progress = 0;
        this.status_text = 'initialized';

        this.workflowReport = await this.workflowReportService.createReport({
            workflow_type: WorkflowType.VALIDATION,
            workflow: validationDefinition,
            status: 'initialized',
            progress: 0,
            params: {
                target: validationDefinition.target,
                target_filter: validationDefinition.target_filter,
                rule_count: validationDefinition.rules.length,
            },
        });
    }

    getCurrentWorkflowReportId(): number | undefined {
        return this.workflowReport?.id;
    }

    status() {
        return {
            progress: this.progress,
            status: this.status_text,
        };
    }

    async validate(by_user?: string): Promise<ValidationSummary> {
        if (!this.validationDefinition?.rules?.length) {
            throw createInvalidRequestHttpException('Validation workflow is not configured.');
        }
        if (!hasProvidedEntityId(this.workflowReport?.id)) {
            throw createInvalidRequestHttpException('Validation workflow report is not configured.');
        }

        const startedAt = new Date();
        await this.updateRuntimeStatus(-1, `Started on ${startedAt}`, {
            by_user,
            started_at: startedAt,
            params: {
                ...this.workflowReport.params as Record<string, unknown>,
                by_user,
            }
        });

        try {
            const subjects = await this.loadValidationTargets();
            await this.workflowReportService.write(this.workflowReport.id, {
                timestamp: new Date(),
                level: WorkflowReportItemLevel.INFO,
                code: 'validation.selection',
                message: `${subjects.length} ${this.validationDefinition.target} objects selected for validation`,
            });
            let lastReportActivityAt = Date.now();

            const summary: ValidationSummary = {
                target: this.validationDefinition.target,
                checked: 0,
                findings: 0,
                info: 0,
                warning: 0,
                error: 0,
            };

            for (const subject of subjects) {
                summary.checked++;
                const findings = this.evaluateRules(subject);
                summary.findings += findings.length;

                if (findings.length === 0) {
                    lastReportActivityAt = await this.heartbeatIfNeeded(lastReportActivityAt);
                    continue;
                }

                for (const finding of findings) {
                    summary[finding.level]++;
                    await this.workflowReportService.write(this.workflowReport.id, {
                        timestamp: new Date(),
                        level: finding.level as WorkflowReportItemLevel,
                        code: finding.code,
                        message: finding.message,
                    });
                    lastReportActivityAt = Date.now();
                }
            }

            if (summary.findings === 0) {
                await this.workflowReportService.write(this.workflowReport.id, {
                    timestamp: new Date(),
                    level: WorkflowReportItemLevel.INFO,
                    code: 'validation.clean',
                    message: 'Validation completed without findings',
                });
            }

            await this.workflowReportService.finish(this.workflowReport.id, {
                status: 'Successful validation',
                summary,
            });
            this.status_text = `Successful validation on ${new Date()}`;
            this.progress = 0;
            return summary;
        } catch (error) {
            await this.workflowReportService.write(this.workflowReport.id, {
                timestamp: new Date(),
                level: WorkflowReportItemLevel.ERROR,
                code: 'validation.error',
                message: `Error while validating: ${error instanceof Error ? error.message : String(error)}`,
            });
            await this.workflowReportService.finish(this.workflowReport.id, {
                status: 'Error while validating',
                summary: {
                    target: this.validationDefinition.target,
                }
            });
            this.status_text = `Error while validating on ${new Date()}`;
            this.progress = 0;
            throw error;
        }
    }

    private async loadValidationTargets(): Promise<unknown[]> {
        switch (this.validationDefinition?.target) {
            case 'publication':
                return this.publicationService.getAll(this.validationDefinition.target_filter, { serializeDates: true }) as Promise<Publication[]>;
            default:
                throw createInvalidRequestHttpException(`Unsupported validation target: ${this.validationDefinition?.target}`);
        }
    }

    private evaluateRules(subject: unknown): ValidationFinding[] {
        if (!this.validationDefinition?.rules?.length) return [];

        return this.validationDefinition.rules.flatMap((rule) => {
            switch (rule.type) {
                case 'required':
                    return this.matchesCondition(subject, rule) ? [] : [this.buildFinding(subject, rule.result, `validation.required.${rule.path}`, `${this.describeSubject(subject)} is missing required value at "${rule.path}"`)];
                case 'compare':
                    return this.matchesCondition(subject, rule, 'ignore') ? [] : [this.buildFinding(subject, rule.result, `validation.compare.${rule.path}`, `${this.describeSubject(subject)} does not satisfy compare rule at "${rule.path}"`)];
                case 'conditional':
                    return this.evaluateConditionalRule(subject, rule);
                default:
                    return [];
            }
        });
    }

    private evaluateConditionalRule(subject: unknown, rule: ValidationConditionalRule): ValidationFinding[] {
        if (!this.matchesConditionGroup(subject, rule.if, 'no-match')) return [];
        if (this.matchesConditionGroup(subject, rule.then, 'ignore')) return [];

        return [this.buildFinding(
            subject,
            rule.result,
            'validation.conditional',
            `${this.describeSubject(subject)} matched IF conditions but failed THEN conditions`,
        )];
    }

    private buildFinding(subject: unknown, result: 'info' | 'warning' | 'error', code: string, message: string): ValidationFinding {
        return {
            level: result,
            code,
            message,
        };
    }

    private matchesConditionGroup(subject: unknown, conditions: ValidationCondition | ValidationCondition[], compareEmptyMode: CompareEmptyMode = 'no-match'): boolean {
        const conditionList = Array.isArray(conditions) ? conditions : [conditions];
        return conditionList.every((condition) => this.matchesCondition(subject, condition, compareEmptyMode));
    }

    private matchesCondition(subject: unknown, condition: ValidationCondition, compareEmptyMode: CompareEmptyMode = 'no-match'): boolean {
        const values = this.getPathValues(subject, condition.path);
        switch (condition.type) {
            case 'required':
                return this.hasPresentValue(values);
            case 'compare':
                return this.matchesCompareCondition(values, condition, compareEmptyMode);
            default:
                return false;
        }
    }

    private matchesCompareCondition(values: unknown[], condition: ValidationCompareCondition, compareEmptyMode: CompareEmptyMode): boolean {
        const presentValues = values.filter((value) => this.isPresentValue(value));
        if (presentValues.length === 0) return compareEmptyMode === 'ignore';

        const matches = this.matchesCompare(presentValues, condition);
        return condition.negate ? !matches : matches;
    }

    private matchesCompare(values: unknown[], condition: ValidationCompareCondition): boolean {
        if (values.length === 0) return false;

        switch (condition.comp) {
            case CompareOperation.EQUALS:
                return values.some((entry) => this.matchesEquals(entry, condition.value));
            case CompareOperation.INCLUDES:
                return values.some((entry) => this.matchesIncludes(entry, condition.value));
            case CompareOperation.STARTS_WITH:
                return values.some((entry) => this.matchesStartsWith(entry, condition.value));
            case CompareOperation.GREATER_THAN:
                return values.some((entry) => this.matchesComparable(entry, condition.value, '>'));
            case CompareOperation.SMALLER_THAN:
                return values.some((entry) => this.matchesComparable(entry, condition.value, '<'));
            case CompareOperation.IN:
                return values.some((entry) => this.matchesIn(entry, condition.value));
            default:
                return false;
        }
    }

    private matchesEquals(actual: unknown, expected: SearchFilterValue): boolean {
        const expectedValues = Array.isArray(expected) ? expected : [expected];
        return expectedValues.some((entry) => actual === entry);
    }

    private matchesIncludes(actual: unknown, expected: SearchFilterValue): boolean {
        const haystack = String(actual ?? '').toLowerCase();
        const expectedValues = Array.isArray(expected) ? expected : [expected];
        return expectedValues.some((entry) => haystack.includes(String(entry ?? '').toLowerCase()));
    }

    private matchesStartsWith(actual: unknown, expected: SearchFilterValue): boolean {
        const haystack = String(actual ?? '').toLowerCase();
        const expectedValues = Array.isArray(expected) ? expected : [expected];
        return expectedValues.some((entry) => haystack.startsWith(String(entry ?? '').toLowerCase()));
    }

    private matchesComparable(actual: unknown, expected: SearchFilterValue, operator: '>' | '<'): boolean {
        const expectedValue = Array.isArray(expected) ? expected[0] : expected;
        if (expectedValue === undefined || expectedValue === null) return false;

        const left = this.normalizeComparableValue(actual);
        const right = this.normalizeComparableValue(expectedValue);
        if (left === undefined || right === undefined) return false;

        return operator === '>' ? left > right : left < right;
    }

    private matchesIn(actual: unknown, expected: SearchFilterValue): boolean {
        const expectedValues = Array.isArray(expected) ? expected : [expected];
        return expectedValues.includes(actual as never);
    }

    private normalizeComparableValue(value: unknown): number | string | undefined {
        if (value === undefined || value === null || typeof value === 'boolean') return undefined;
        if (typeof value === 'number') return value;
        if (value instanceof Date) return value.getTime();
        if (typeof value === 'string') {
            const numericValue = Number(value);
            if (!Number.isNaN(numericValue) && value.trim() !== '') return numericValue;

            const dateValue = Date.parse(value);
            if (!Number.isNaN(dateValue)) return dateValue;

            return value;
        }
        return undefined;
    }

    private hasPresentValue(values: unknown[]): boolean {
        return values.some((value) => this.isPresentValue(value));
    }

    private isPresentValue(value: unknown): boolean {
        if (value === undefined || value === null) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        return true;
    }

    private getPathValues(subject: unknown, path: string): unknown[] {
        const segments = path.split('.').map((segment) => segment.trim()).filter(Boolean);
        if (!segments.length) return [];
        return this.resolvePathValues([subject], segments);
    }

    private resolvePathValues(candidates: unknown[], segments: string[]): unknown[] {
        if (segments.length === 0) {
            return candidates.flatMap((candidate) => Array.isArray(candidate) ? candidate : [candidate]);
        }

        const [segment, ...rest] = segments;
        const nextCandidates = candidates.flatMap((candidate) => this.extractSegmentValues(candidate, segment));
        if (nextCandidates.length === 0) return [];
        return this.resolvePathValues(nextCandidates, rest);
    }

    private extractSegmentValues(candidate: unknown, segment: string): unknown[] {
        if (candidate === undefined || candidate === null) return [];

        if (Array.isArray(candidate)) {
            const numericIndex = Number(segment);
            if (Number.isInteger(numericIndex)) {
                return numericIndex >= 0 && numericIndex < candidate.length ? [candidate[numericIndex]] : [];
            }
            return candidate.flatMap((entry) => this.extractSegmentValues(entry, segment));
        }

        if (typeof candidate !== 'object') return [];

        const value = (candidate as Record<string, unknown>)[segment];
        if (value === undefined) return [];
        return Array.isArray(value) ? value : [value];
    }

    private describeSubject(subject: unknown): string {
        if (this.validationDefinition?.target === 'publication') {
            const publication = subject as Partial<Publication>;
            const idPart = hasProvidedEntityId(publication?.id) ? `Publication ${publication.id}` : 'Publication';
            const titlePart = typeof publication?.title === 'string' && publication.title.trim().length > 0
                ? ` "${publication.title}"`
                : '';
            return `${idPart}${titlePart}`;
        }

        return 'Validation target';
    }

    private async updateRuntimeStatus(
        progress: number,
        status?: string,
        extra?: {
            by_user?: string;
            started_at?: Date;
            params?: unknown;
        }
    ) {
        this.progress = progress;
        if (status !== undefined) this.status_text = status;
        if (!hasProvidedEntityId(this.workflowReport?.id)) return;

        this.workflowReport = await this.workflowReportService.updateStatus(this.workflowReport.id, {
            progress,
            status,
            by_user: extra?.by_user,
            started_at: extra?.started_at,
            params: extra?.params,
        });
    }

    private async heartbeatIfNeeded(lastReportActivityAt: number): Promise<number> {
        const now = Date.now();
        if ((now - lastReportActivityAt) < this.validationHeartbeatIntervalMs) {
            return lastReportActivityAt;
        }

        await this.updateRuntimeStatus(-1);
        return now;
    }
}
