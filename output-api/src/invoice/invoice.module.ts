import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../config/app-config.module';
import { CostCenter } from './CostCenter.entity';
import { CostItem } from './CostItem.entity';
import { CostType } from './CostType.entity';
import { Invoice } from './Invoice.entity';
import { Publication } from '../publication/core/Publication.entity';
import { InvoiceController } from './InvoiceController';
import { InvoiceService } from './invoice.service';
import { CostTypeService } from './cost-type.service';
import { CostCenterService } from './cost-center.service';
import { InvoiceIndexController } from './InvoiceIndexController';
import { InvoiceIndexService } from './invoice-index.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, CostCenter, CostItem, CostType, Publication]),
    AppConfigModule
  ],
  controllers: [InvoiceController, InvoiceIndexController],
  providers: [InvoiceService, InvoiceIndexService, CostTypeService, CostCenterService],
  exports: [InvoiceService, CostTypeService, CostCenterService, TypeOrmModule]
})
export class InvoiceModule { }
