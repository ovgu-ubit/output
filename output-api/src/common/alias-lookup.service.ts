import { Injectable } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';

@Injectable()
export class AliasLookupService {
    public async findCanonicalLabel<TAlias extends { element?: TElement }, TElement extends { label?: string } = any>(
        repository: Repository<TAlias>,
        searchLabels: string | string[],
    ): Promise<string | null> {
        const alias = await this.findAlias(repository, searchLabels);
        const element = alias ? (alias as any).element as TElement | undefined : undefined;
        return element?.label ?? null;
    }

    public async findCanonicalElement<TAlias extends { element?: TElement }, TElement = any>(
        repository: Repository<TAlias>,
        searchLabels: string | string[],
    ): Promise<TElement | null> {
        const alias = await this.findAlias(repository, searchLabels);
        return alias ? ((alias as any).element as TElement | undefined ?? null) : null;
    }

    public async findCanonicalElementId<TAlias extends { elementId?: number }>(
        repository: Repository<TAlias>,
        searchLabels: string | string[],
    ): Promise<number | null> {
        const alias = await this.findAlias(repository, searchLabels);
        if (!alias) return null;
        const elementId = (alias as any).elementId as number | undefined;
        if (typeof elementId === 'number') {
            return elementId;
        }
        const element = (alias as any).element as { id?: number } | undefined;
        return element?.id ?? null;
    }

    public async findAlias<TAlias>(
        repository: Repository<TAlias>,
        searchLabels: string | string[],
    ): Promise<TAlias | null> {
        const query = this.buildAliasQuery(repository, searchLabels);
        if (!query) {
            return null;
        }
        return query.getOne();
    }

    public async findAliases<TAlias>(
        repository: Repository<TAlias>,
        searchLabels: string | string[],
    ): Promise<TAlias[]> {
        const query = this.buildAliasQuery(repository, searchLabels);
        if (!query) {
            return [];
        }
        return query.getMany();
    }

    private buildAliasQuery<TAlias>(
        repository: Repository<TAlias>,
        searchLabels: string | string[],
    ): SelectQueryBuilder<TAlias> | null {
        const labels = (Array.isArray(searchLabels) ? searchLabels : [searchLabels])
            .map(label => label?.trim())
            .filter((label): label is string => !!label);

        if (labels.length === 0) {
            return null;
        }

        const query = repository
            .createQueryBuilder('alias')
            .leftJoinAndSelect('alias.element', 'element');

        labels.forEach((label, index) => {
            const paramName = `label${index}`;
            const condition = `:${paramName} ILIKE CONCAT('%', alias.alias, '%')`;
            if (index === 0) {
                query.where(condition, { [paramName]: label });
            } else {
                query.orWhere(condition, { [paramName]: label });
            }
        });

        return query;
    }
}
