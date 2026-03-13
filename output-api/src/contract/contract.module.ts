import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../config/app-config.module';
import { PublicationModule } from '../publication/publication.module';
import { Contract } from './Contract.entity';
import { ContractController } from './ContractController';
import { ContractIdentifier } from './ContractIdentifier.entity';
import { ContractService } from './contract.service';
import { ContractComponent } from './ContractComponent.entity';
import { Invoice } from '../invoice/Invoice.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contract, ContractIdentifier, ContractComponent, Invoice]),
    PublicationModule,
    AppConfigModule
  ],
  controllers: [ContractController],
  providers: [ContractService],
  exports: [ContractService, TypeOrmModule]
})
export class ContractModule {}
