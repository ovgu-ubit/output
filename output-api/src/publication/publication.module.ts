import { Module } from '@nestjs/common';
import { PublicationCoreModule } from './core/publication-core.module';
import { PublicationLookupModule } from './lookups/publication-lookup.module';
import { PublicationRelationsModule } from './relations/publication-relations.module';

@Module({
  imports: [
    PublicationCoreModule,
    PublicationRelationsModule,
    PublicationLookupModule,
    ],
  exports: [PublicationCoreModule, PublicationRelationsModule, PublicationLookupModule]
})
export class PublicationModule { }
