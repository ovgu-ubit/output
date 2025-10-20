import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthorModule } from './author/author.module';
import { AuthorizationModule } from "./authorization/authorization.module";
import { AppConfigModule } from "./config/app-config.module";
import { ContractModule } from "./contract/contract.module";
import { StatisticController } from "./controller/StatisticController";
import { FunderModule } from "./funder/funder.module";
import { GreaterEntityModule } from "./greater_entity/greater-entity.module";
import { InstituteModule } from "./institute/institute.module";
import { InvoiceModule } from "./invoice/invoice.module";
import { OACategoryModule } from "./oa_category/oa-category.module";
import { PublicationTypeModule } from "./pub_type/pub-type.module";
import { PublicationModule } from './publication/publication.module';
import { PublisherModule } from "./publisher/publisher.module";
import { DatabaseConfigService } from "./services/database.config.service";
import { StatisticsService } from "./services/statistics.service";
import { WorkflowModule } from "./workflow/workflow.module";


@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfigService
    }),
    AuthorModule,
    PublicationModule,
    InstituteModule,
    AuthorizationModule,
    ContractModule,
    FunderModule,
    GreaterEntityModule,
    InvoiceModule,
    OACategoryModule,
    PublicationTypeModule,
    PublisherModule,
    AppConfigModule,
    WorkflowModule
  ],
  controllers: [StatisticController],
  providers: [
    StatisticsService,    
  ]
})

export class AppModule { }
