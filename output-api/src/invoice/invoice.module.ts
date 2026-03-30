import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../config/app-config.module';
import { CostCenter } from './CostCenter.entity';
import { CostItem } from './CostItem.entity';
import { CostType } from './CostType.entity';
import { Invoice } from './Invoice.entity';
import { InvoiceController } from './InvoiceController';
import { InvoiceService } from './invoice.service';
import { CostTypeService } from './cost-type.service';
import { CostCenterService } from './cost-center.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, CostCenter, CostItem, CostType]),
    AppConfigModule
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService, CostTypeService, CostCenterService],
  exports: [InvoiceService, CostTypeService, CostCenterService, TypeOrmModule]
})
export class InvoiceModule { }
