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
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from "path";

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
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'ui-dist', "browser"),
      exclude: ['/api/{*splat}'],
    }),
  ],
  controllers: [],
  providers: []
})

export class AppModule { }
