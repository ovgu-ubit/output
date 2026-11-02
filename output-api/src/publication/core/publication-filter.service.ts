import { Inject, Injectable } from '@nestjs/common';
import {  PublicationIndex  } from '@output/interfaces';
import { createNotFoundHttpException } from '../../common/api-error';
import { AbstractFilterService, getFilterServiceMeta, supportsSqlFiltering } from '../../workflow/filter/abstract-filter.service';
import { Publication } from './Publication.entity';
import { SelectQueryBuilder } from 'typeorm';

export interface PublicationFilterDefinition {
    path: string;
    label: string;
}

@Injectable()
export class PublicationFilterService {
    constructor(
        @Inject('Filters') private readonly filterServices: AbstractFilterService<PublicationIndex | Publication>[],
    ) { }

    public listDefinitions(): PublicationFilterDefinition[] {
        return this.filterServices.map((filterService) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
            const meta = getFilterServiceMeta(filterService.constructor as Function)!;
            return {
                path: meta.path,
                label: filterService.getName(),
            };
        });
    }

    public async applyPaths<T extends PublicationIndex | Publication>(publications: T[], paths?: string[]) {
        let filtered = publications;
        if (!paths?.length) return filtered;

        const definitions = this.listDefinitions();
        for (const path of paths) {
            const filterIndex = definitions.findIndex((definition) => definition.path === path);
            if (filterIndex === -1) {
                throw createNotFoundHttpException('Filter not found.');
            }
            filtered = await this.filterServices[filterIndex].filter(filtered) as T[];
        }

        return filtered;
    }

    public applyPathsToQuery(query: SelectQueryBuilder<Publication>, paths?: string[]): SelectQueryBuilder<Publication> {
        if (!paths?.length) return query;

        const definitions = this.listDefinitions();
        for (const path of paths) {
            const filterIndex = definitions.findIndex((definition) => definition.path === path);
            if (filterIndex === -1) throw createNotFoundHttpException('Filter not found.');

            const filterService = this.filterServices[filterIndex];
            if (!supportsSqlFiltering(filterService)) {
                throw createNotFoundHttpException('Filter is not available for paginated indexes.');
            }
            query.andWhere(filterService.getSqlPredicate(query.alias));
        }
        return query;
    }
}
