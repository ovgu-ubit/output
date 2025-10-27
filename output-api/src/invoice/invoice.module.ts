import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { Invoice } from './Invoice.entity';
import { CostCenter } from './CostCenter.entity';
import { CostItem } from './CostItem.entity';
import { CostType } from './CostType.entity';
import { InvoiceController } from './InvoiceController';
import { InvoiceService } from './invoice.service';
import { AppConfigModule } from '../config/app-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, CostCenter, CostItem, CostType]),
    AuthorizationModule,
    AppConfigModule
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService],
  exports: [InvoiceService, TypeOrmModule]
})
export class InvoiceModule { }
