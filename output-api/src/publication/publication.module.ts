import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { PublicationCoreModule } from './core/publication-core.module';
import { PublicationLookupModule } from './lookups/publication-lookup.module';
import { PublicationRelationsModule } from './relations/publication-relations.module';

@Module({
  imports: [
    PublicationCoreModule,
    PublicationRelationsModule,
    PublicationLookupModule,
    AuthorizationModule],
  exports: [PublicationCoreModule, PublicationRelationsModule, PublicationLookupModule]
})
export class PublicationModule { }
