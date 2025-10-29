
import { Type} from '@nestjs/common'
import { InitService } from "../init.service";
import { PublicationIndex } from '../../../output-interfaces/PublicationIndex';
import { Publication } from '../../../output-interfaces/Publication';
import { AuthorizationService } from '../authorization/authorization.service';
import { AbstractExportService } from '../workflow/export/abstract-export.service';
import { AbstractFilterService } from '../workflow/filter/abstract-filter.service';
import { AbstractImportService } from '../workflow/import/abstract-import';
import { AbstractPlausibilityService } from '../workflow/check/abstract-plausibility.service';

export interface AppConfig {
    api_key_unpaywall? : string;
    api_key_oam? : string;
    api_key_scopus?: string;
    init_service: Type<InitService>;
    import_services: {path: string, class: Type<AbstractImportService>}[];
    doi_import_service: string;
    enrich_services: {path: string, class: Type<AbstractImportService>}[];
    check_services: {path: string, class: Type<AbstractPlausibilityService>}[];
    export_services: {path: string, class: Type<AbstractExportService>}[];
    filter_services: {path: string, class: Type<AbstractFilterService<PublicationIndex|Publication>>}[];
    optional_fields: {
        abstract: boolean;
        citation: boolean;
        page_count: boolean;
        pub_date_submitted: boolean;
        pub_date_print: boolean;
        peer_reviewed: boolean;
    },
    pub_index_columns: string[];
}