import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ImportStopResponse } from '@output/interfaces';
import { createWorkflowRunningHttpException } from '../common/api-error';

export type ImportExecutionTarget = { workflowId: number } | { kind: 'import' | 'enrich'; path: string };
export type ImportStopReason = 'user' | 'watchdog';

export class ImportExecution {
    readonly runId = randomUUID();
    readonly controller = new AbortController();
    readonly work = new Set<Promise<unknown>>();
    readonly completion: Promise<void>;
    private resolveCompletion!: () => void;
    failure?: unknown;
    terminal = false;
    stop?: { reason: ImportStopReason; by_user?: string; requested_at: Date };

    constructor(readonly target: ImportExecutionTarget) {
        this.completion = new Promise(resolve => { this.resolveCompletion = resolve; });
    }

    get signal(): AbortSignal { return this.controller.signal; }

    track(work: Promise<unknown>): void {
        this.work.add(work);
        void work.catch(error => {
            if (!this.signal.aborted) this.failure ??= error;
        }).finally(() => this.work.delete(work));
    }

    async drain(): Promise<void> {
        while (this.work.size) await Promise.allSettled([...this.work]);
    }

    finish(): void { this.resolveCompletion(); }
}

export interface ImportExecutionParticipant {
    bindExecution(execution: ImportExecution): void;
    notifyStop(execution: ImportExecution): Promise<void>;
    finalizeExecution(execution: ImportExecution): Promise<void>;
}

@Injectable()
export class ImportExecutionService {
    private readonly logger = new Logger(ImportExecutionService.name);
    private readonly executions = new Map<string, { run: ImportExecution; participant: ImportExecutionParticipant }>();

    get(key: string): ImportExecution | undefined { return this.executions.get(key)?.run; }

    async run<T>(
        key: string,
        target: ImportExecutionTarget,
        participant: ImportExecutionParticipant,
        action: () => Promise<T>,
        watchdogTimeout?: () => Promise<number>,
    ): Promise<T | undefined> {
        if (this.executions.has(key)) throw createWorkflowRunningHttpException();
        const run = new ImportExecution(target);
        this.executions.set(key, { run, participant });
        let timer: ReturnType<typeof setTimeout> | undefined;
        const finish = async () => {
            try {
                await run.drain();
                run.terminal = true;
                await participant.finalizeExecution(run);
            } finally {
                if (timer) clearTimeout(timer);
                if (this.executions.get(key)?.run === run) this.executions.delete(key);
                run.finish();
            }
        };
        try {
            participant.bindExecution(run);
            if (watchdogTimeout) {
                timer = setTimeout(() => this.requestStop(key, 'watchdog', undefined, run), await watchdogTimeout());
                timer.unref?.();
            }
            run.signal.throwIfAborted();
            const result = await action();
            // The HTTP start response does not wait for detached subscriptions.
            void finish().catch(error => this.logger.error('Could not finalize import execution', error));
            return result;
        } catch (error) {
            if (!run.signal.aborted) run.failure ??= error;
            await finish();
            if (!run.signal.aborted) throw error;
            return undefined;
        }
    }

    requestStop(key: string, reason: ImportStopReason = 'user', by_user?: string, expectedRun: ImportExecution | null | undefined = this.get(key)): ImportStopResponse {
        const entry = this.executions.get(key);
        if (!entry || entry.run !== expectedRun || entry.run.terminal) return { state: 'not-running' };
        const { run, participant } = entry;
        if (!run.stop) {
            run.stop = { reason, by_user, requested_at: new Date() };
            run.controller.abort(new DOMException('Import cancelled', 'AbortError'));
            run.track(participant.notifyStop(run));
        }
        return { state: 'stopping', runId: run.runId };
    }
}
