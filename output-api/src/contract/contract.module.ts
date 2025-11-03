import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../config/app-config.module';
import { PublicationModule } from '../publication/publication.module';
import { Contract } from './Contract.entity';
import { ContractController } from './ContractController';
import { ContractIdentifier } from './ContractIdentifier.entity';
import { ContractService } from './contract.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contract, ContractIdentifier]), 
    PublicationModule, 
    AppConfigModule
  ],
  controllers: [ContractController],
  providers: [ContractService],
  exports: [ContractService, TypeOrmModule]
})
export class ContractModule {}
