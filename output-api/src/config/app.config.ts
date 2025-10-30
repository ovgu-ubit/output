
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
    doi_import_service: string;
}