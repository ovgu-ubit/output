import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from './Contract';
import { ContractIdentifier } from './ContractIdentifier';
import { PublicationModule } from '../publication/publication.module';
import { ContractController } from './ContractController';
import { ContractService } from './contract.service';
import { AuthorizationModule } from '../authorization/authorization.module';

@Module({
  imports: [TypeOrmModule.forFeature([Contract, ContractIdentifier]), PublicationModule, AuthorizationModule],
  controllers: [ContractController],
  providers: [ContractService],
  exports: [ContractService, TypeOrmModule]
})
export class ContractModule {}
