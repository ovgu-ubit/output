import { Module } from "@nestjs/common";
import { AuthorModule } from './author/author.module';
import { AuthorizationModule } from "./authorization/authorization.module";
import { AppConfigModule } from "./config/app-config.module";
import { ContractModule } from "./contract/contract.module";
import { FunderModule } from "./funder/funder.module";
import { GreaterEntityModule } from "./greater_entity/greater-entity.module";
import { InstituteModule } from "./institute/institute.module";
import { InvoiceModule } from "./invoice/invoice.module";
import { OACategoryModule } from "./oa_category/oa-category.module";
import { PublicationTypeModule } from "./pub_type/pub-type.module";
import { PublicationModule } from './publication/publication.module';
import { PublisherModule } from "./publisher/publisher.module";
import { StatisticsModule } from "./statistics/statistics.module";
import { WorkflowModule } from "./workflow/workflow.module";

@Module({
  imports: [
    AuthorModule,
    PublicationModule,
    InstituteModule,
    AuthorizationModule.forRootAsync(),
    ContractModule,
    FunderModule,
    GreaterEntityModule,
    InvoiceModule,
    OACategoryModule,
    PublicationTypeModule,
    PublisherModule,
    AppConfigModule,
    WorkflowModule,
    StatisticsModule,
  ],
  controllers: [],
  providers: []
})

export class AppModule { }
