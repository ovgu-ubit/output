import { Inject, Injectable } from '@nestjs/common';
import {  PublicationIndex  } from '@output/interfaces';
import { createNotFoundHttpException } from '../../common/api-error';
import { AbstractFilterService, getFilterServiceMeta } from '../../workflow/filter/abstract-filter.service';
import { Publication } from './Publication.entity';

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
}
