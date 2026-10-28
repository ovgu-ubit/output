import { Injectable } from '@nestjs/common';
import { ExportEntityType, SearchFilter } from '@output/interfaces';
import { Author } from '../../author/Author.entity';
import { AuthorService } from '../../author/author.service';
import { EntityAccessRight } from '../../common/abstract-entity.service';
import { createInvalidRequestHttpException } from '../../common/api-error';
import { Contract } from '../../contract/Contract.entity';
import { ContractService } from '../../contract/contract.service';
import { Funder } from '../../funder/Funder.entity';
import { FunderService } from '../../funder/funder.service';
import { GreaterEntity } from '../../greater_entity/GreaterEntity.entity';
import { GreaterEntityService } from '../../greater_entity/greater-entitiy.service';
import { Institute } from '../../institute/Institute.entity';
import { InstituteService } from '../../institute/institute.service';
import { CostCenter } from '../../invoice/CostCenter.entity';
import { CostType } from '../../invoice/CostType.entity';
import { InvoiceService } from '../../invoice/invoice.service';
import { OA_Category } from '../../oa_category/OA_Category.entity';
import { OACategoryService } from '../../oa_category/oa-category.service';
import { Publication } from '../../publication/core/Publication.entity';
import { PublicationIndexService } from '../../publication/core/publication-index.service';
import { PublicationType } from '../../pub_type/PublicationType.entity';
import { PublicationTypeService } from '../../pub_type/publication-type.service';
import { Publisher } from '../../publisher/Publisher.entity';
import { PublisherService } from '../../publisher/publisher.service';

export type ExportSourceEntity = Publication | Author | Institute | GreaterEntity | Publisher
    | Contract | Funder | OA_Category | PublicationType | CostCenter | CostType;

@Injectable()
export class ExportSourceService {
    constructor(
        private publicationService: PublicationIndexService,
        private authorService: AuthorService,
        private instituteService: InstituteService,
        private greaterEntityService: GreaterEntityService,
        private publisherService: PublisherService,
        private contractService: ContractService,
        private funderService: FunderService,
        private oaCategoryService: OACategoryService,
        private publicationTypeService: PublicationTypeService,
        private invoiceService: InvoiceService,
    ) { }

    public load(source: ExportEntityType, filter?: SearchFilter): Promise<ExportSourceEntity[]> {
        const loaders: Record<ExportEntityType, () => Promise<ExportSourceEntity[]>> = {
            publication: () => this.publicationService.getAll(filter, { serializeDates: true }),
            author: () => this.authorService.getForExport({ rights: { [EntityAccessRight.Read]: true } }),
            institute: () => this.instituteService.get(),
            greater_entity: () => this.greaterEntityService.get(),
            publisher: () => this.publisherService.getForExport(),
            contract: () => this.contractService.getForExport(),
            funder: () => this.funderService.getForExport(),
            oa_category: () => this.oaCategoryService.get(),
            pub_type: () => this.publicationTypeService.getForExport(),
            cost_center: () => this.invoiceService.getCostCenters(),
            cost_type: () => this.invoiceService.getCostTypes(),
        };
        if (!Object.prototype.hasOwnProperty.call(loaders, source)) {
            throw createInvalidRequestHttpException('Unsupported export source entity.');
        }
        return loaders[source]();
    }
}
