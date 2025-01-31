
import { Type} from '@nestjs/common'
import { AbstractPlausibilityService } from "./services/check/abstract-plausibility.service";
import { AbstractExportService } from "./services/export/abstract-export.service";
import { AbstractImportService } from "./services/import/abstract-import";
import { InitService } from "./services/init.service";
import { AuthorizationService } from './guards/authorization.service';
import { AbstractFilterService } from './services/filter/abstract-filter.service';
import { PublicationIndex } from '../../output-interfaces/PublicationIndex';
import { Publication } from '../../output-interfaces/Publication';

export interface AppConfig {
    institution_label: string;
    institution_short_label: string;
    lock_timeout: number; 
    searchTags: string[];
    affiliationTags: string[];
    ror_id? : string;
    openalex_id? : string;
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
    authorization_service: Type<AuthorizationService>;
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