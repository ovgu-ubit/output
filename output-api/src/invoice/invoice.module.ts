import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { Invoice } from './Invoice';
import { CostCenter } from './CostCenter';
import { CostItem } from './CostItem';
import { CostType } from './CostType';
import { InvoiceController } from './InvoiceController';
import { InvoiceService } from './invoice.service';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, CostCenter, CostItem, CostType]), AuthorizationModule],
  controllers: [InvoiceController],
  providers: [InvoiceService],
  exports: [InvoiceService, TypeOrmModule]
})
export class InvoiceModule {}
