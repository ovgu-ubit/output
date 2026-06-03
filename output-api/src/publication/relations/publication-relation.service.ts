import { Injectable } from '@nestjs/common';
import { DataSource, DeepPartial, EntityManager, In } from 'typeorm';
import { Author } from '../../author/Author.entity';
import { createInvalidRequestHttpException, createPersistenceHttpException } from '../../common/api-error';
import { hasProvidedEntityId } from '../../common/entity-id';
import { Institute } from '../../institute/Institute.entity';
import { CostItem } from '../../invoice/CostItem.entity';
import { Invoice } from '../../invoice/Invoice.entity';
import { Publication } from '../core/Publication.entity';
import { PublicationDuplicate } from '../core/PublicationDuplicate.entity';
import { PublicationIdentifier } from '../core/PublicationIdentifier.entity';
import { PublicationSupplement } from '../core/PublicationSupplement.entity';
import { AuthorPublication } from './AuthorPublication.entity';
import { Role } from './Role.entity';

export interface PublicationOwnedCollections {
    authorPublications?: AuthorPublication[];
    identifiers?: PublicationIdentifier[];
    supplements?: PublicationSupplement[];
}

@Injectable()
export class PublicationRelationService {
    constructor(private dataSource: DataSource) { }

    public async saveAuthorPublication(
        author: Author,
        publication: Publication,
        corresponding?: boolean,
        affiliation?: string,
        institute?: Institute,
        role?: Role,
        manager?: EntityManager,
    ) {
        if (!hasProvidedEntityId(author?.id)) {
            throw createInvalidRequestHttpException('Author id is required to save author publication.');
        }
        if (!hasProvidedEntityId(publication?.id)) {
            throw createInvalidRequestHttpException('Publication id is required to save author publication.');
        }
        const authorId = author.id as number;
        const publicationId = publication.id as number;

        const repo = manager ? manager.getRepository(AuthorPublication) : this.dataSource.getRepository(AuthorPublication);
        return repo.save({
            author: { id: authorId } as Author,
            authorId,
            publication: { id: publicationId } as Publication,
            publicationId,
            corresponding,
            affiliation,
            institute,
            role
        }).catch((error: unknown) => {
            throw createPersistenceHttpException(error);
        });
    }

    public getAuthorsPublication(pub: Publication) {
        return this.dataSource.getRepository(AuthorPublication).find({ where: { publicationId: pub.id }, relations: { author: true } });
    }

    public async resetAuthorPublication(pub: Publication, manager?: EntityManager) {
        if (!hasProvidedEntityId(pub?.id)) {
            throw createInvalidRequestHttpException('Publication id is required to reset author publications.');
        }
        const repo = manager ? manager.getRepository(AuthorPublication) : this.dataSource.getRepository(AuthorPublication);
        return repo.delete({ publicationId: pub.id });
    }

    public getPublicationOwnedCollections(publication: Publication): PublicationOwnedCollections {
        return {
            authorPublications: publication.authorPublications,
            identifiers: publication.identifiers,
            supplements: publication.supplements,
        };
    }

    public withoutPublicationOwnedCollections(publication: Publication): Publication {
        const hasOwnedCollection = ['authorPublications', 'identifiers', 'supplements']
            .some((key) => Object.prototype.hasOwnProperty.call(publication, key));
        if (!hasOwnedCollection) {
            return publication;
        }

        const {
            authorPublications: _authorPublications,
            identifiers: _identifiers,
            supplements: _supplements,
            ...publicationToSave
        } = publication;
        return publicationToSave as Publication;
    }

    public async replacePublicationOwnedCollections(publication: Publication, collections: PublicationOwnedCollections, manager: EntityManager): Promise<void> {
        if (collections.authorPublications !== undefined) {
            publication.authorPublications = await this.replaceAuthorPublications(publication, collections.authorPublications, manager);
        }
        if (collections.identifiers !== undefined) {
            publication.identifiers = await this.replaceIdentifiers(publication, collections.identifiers, manager);
        }
        if (collections.supplements !== undefined) {
            publication.supplements = await this.replaceSupplements(publication, collections.supplements, manager);
        }
    }

    public async deletePublicationRelations(publicationIds: number[], manager: EntityManager) {
        const ids = publicationIds.filter((publicationId): publicationId is number => hasProvidedEntityId(publicationId));
        if (ids.length === 0) return;

        const publications = await manager.getRepository(Publication).find({
            where: { id: In(ids) },
            relations: { invoices: { cost_items: true } },
            withDeleted: true,
        });
        const invoiceIds = publications
            .flatMap((publication) => publication.invoices ?? [])
            .map((invoice) => invoice.id)
            .filter((invoiceId): invoiceId is number => hasProvidedEntityId(invoiceId));
        const costItemIds = publications
            .flatMap((publication) => publication.invoices ?? [])
            .flatMap((invoice) => invoice.cost_items ?? [])
            .map((costItem) => costItem.id)
            .filter((costItemId): costItemId is number => hasProvidedEntityId(costItemId));

        await manager.getRepository(AuthorPublication).delete({ publicationId: In(ids) });
        if (costItemIds.length > 0) await manager.getRepository(CostItem).delete(costItemIds);
        if (invoiceIds.length > 0) await manager.getRepository(Invoice).delete(invoiceIds);
        await manager.getRepository(PublicationIdentifier).delete({ entity: { id: In(ids) } });
        await manager.getRepository(PublicationSupplement).delete({ publication: { id: In(ids) } });
        await manager.getRepository(PublicationDuplicate).delete({ id_first: In(ids) });
        await manager.getRepository(PublicationDuplicate).delete({ id_second: In(ids) });
    }

    private async replaceAuthorPublications(publication: Publication, authorPublications: AuthorPublication[], manager: EntityManager): Promise<AuthorPublication[]> {
        const publicationId = publication?.id;
        if (!hasProvidedEntityId(publicationId)) {
            throw createInvalidRequestHttpException('Publication id is required to save author publications.');
        }
        const normalizedPublicationId = publicationId as number;

        await manager.getRepository(AuthorPublication).delete({ publicationId: normalizedPublicationId });
        if (!authorPublications || authorPublications.length === 0) return [];

        const normalizedAuthorPublications = authorPublications.map((authorPublication, index) =>
            this.normalizeAuthorPublication(normalizedPublicationId, authorPublication, index),
        );

        return manager.getRepository(AuthorPublication).save(normalizedAuthorPublications).catch((error: unknown) => {
            throw createPersistenceHttpException(error);
        });
    }

    private async replaceIdentifiers(publication: Publication, identifiers: PublicationIdentifier[], manager: EntityManager): Promise<PublicationIdentifier[]> {
        const publicationId = this.requirePublicationId(publication, 'save publication identifiers');
        await manager.getRepository(PublicationIdentifier).delete({ entity: { id: publicationId } });
        if (!identifiers || identifiers.length === 0) return [];

        const normalizedIdentifiers = identifiers.map((identifier) => this.normalizeIdentifier(publicationId, identifier));
        return manager.getRepository(PublicationIdentifier).save(normalizedIdentifiers).catch((error: unknown) => {
            throw createPersistenceHttpException(error);
        });
    }

    private normalizeIdentifier(publicationId: number, identifier: PublicationIdentifier): DeepPartial<PublicationIdentifier> {
        return {
            type: identifier.type?.toLowerCase(),
            value: identifier.value?.toUpperCase(),
            entity: { id: publicationId } as Publication,
        };
    }

    private async replaceSupplements(publication: Publication, supplements: PublicationSupplement[], manager: EntityManager): Promise<PublicationSupplement[]> {
        const publicationId = this.requirePublicationId(publication, 'save publication supplements');
        await manager.getRepository(PublicationSupplement).delete({ publication: { id: publicationId } });
        if (!supplements || supplements.length === 0) return [];

        const normalizedSupplements = supplements.map((supplement) => this.normalizeSupplement(publicationId, supplement));
        return manager.getRepository(PublicationSupplement).save(normalizedSupplements).catch((error: unknown) => {
            throw createPersistenceHttpException(error);
        });
    }

    private normalizeSupplement(publicationId: number, supplement: PublicationSupplement): DeepPartial<PublicationSupplement> {
        return {
            link: supplement.link,
            publication: { id: publicationId } as Publication,
        };
    }

    private requirePublicationId(publication: Publication, operation: string): number {
        const publicationId = publication?.id;
        if (!hasProvidedEntityId(publicationId)) {
            throw createInvalidRequestHttpException(`Publication id is required to ${operation}.`);
        }
        return publicationId;
    }

    private normalizeAuthorPublication(
        publicationId: number,
        authorPublication: AuthorPublication,
        index: number,
    ): DeepPartial<AuthorPublication> {
        const authorId = authorPublication?.author?.id ?? authorPublication?.authorId;
        if (!hasProvidedEntityId(authorId)) {
            throw createInvalidRequestHttpException('authorPublications entries require author.id or authorId.', [
                {
                    path: `authorPublications.${index}.author`,
                    code: 'required',
                    message: 'author.id or authorId is required.',
                },
            ]);
        }

        return {
            author: { id: authorId } as Author,
            authorId,
            publication: { id: publicationId } as Publication,
            publicationId,
            corresponding: authorPublication.corresponding,
            affiliation: authorPublication.affiliation,
            institute: authorPublication.institute,
            role: authorPublication.role,
        };
    }
}
