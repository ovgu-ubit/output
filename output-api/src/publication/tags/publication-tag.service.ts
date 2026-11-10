import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { IndexPageRequest, PublicationTagIndex, PublicationTagMutation } from '@output/interfaces';
import { createEntityLockedHttpException, createInvalidRequestHttpException, createNotFoundHttpException, createPersistenceHttpException } from '../../common/api-error';
import { EditLockOwnerStore, isExpiredEditLock } from '../../common/edit-lock';
import { paginateIndexQuery } from '../../common/index-page';
import { AppConfigService } from '../../config/app-config.service';
import { Publication } from '../core/Publication.entity';
import { PublicationChange } from '../core/PublicationChange.entity';
import { PublicationTag } from './PublicationTag.entity';
import { PublicationTagAssignment } from './PublicationTagAssignment.entity';

export interface ImportTagPlan {
    tags: PublicationTag[];
    addTagIds: number[];
    missingLabels: string[];
}

@Injectable()
export class PublicationTagService {
    constructor(private readonly source: DataSource, private readonly config: AppConfigService) { }

    all() {
        return this.source.getRepository(PublicationTag).find({ order: { label: 'ASC' } });
    }

    async one(id: number) {
        this.ids([id]);
        const tag = await this.source.getRepository(PublicationTag).findOneBy({ id });
        if (!tag) throw createNotFoundHttpException('Tag not found.');
        return tag;
    }

    indexPage(request: IndexPageRequest) {
        const query = this.source.getRepository(PublicationTag).createQueryBuilder('tag')
            .select('tag.id', 'id').addSelect('tag.label', 'label')
            .addSelect('tag.description', 'description').addSelect('tag.color', 'color')
            .addSelect('(SELECT COUNT(*)::int FROM publication_tag_assignment a WHERE a.tag_id = tag.id)', 'usage_count');
        return paginateIndexQuery<PublicationTagIndex>(query, request);
    }

    async save(value: PublicationTag, update = false) {
        if (!value || typeof value.label !== 'string' || !value.label.trim()) {
            throw createInvalidRequestHttpException('Tag label is required.');
        }
        if (value.description != null && typeof value.description !== 'string') {
            throw createInvalidRequestHttpException('Invalid tag description.');
        }
        if (value.color != null && value.color !== '' && (typeof value.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(value.color))) {
            throw createInvalidRequestHttpException('Tag color must be a six-digit hex color.');
        }
        const repo = this.source.getRepository(PublicationTag);
        const fields = { label: value.label.trim(), description: value.description?.trim() || null, color: value.color || null };
        if (update) {
            const [id] = this.ids([value.id]);
            const result = await repo.update({ id }, fields).catch((error: unknown) => { throw createPersistenceHttpException(error); });
            if (!result.affected) throw createNotFoundHttpException('Tag not found.');
            return this.one(id);
        }
        if (value.id !== undefined) throw createInvalidRequestHttpException('A new tag must not have an id.');
        return repo.save(fields)
            .catch((error: unknown) => { throw createPersistenceHttpException(error); });
    }

    ids(value: unknown): number[] {
        if (!Array.isArray(value) || value.some(id => !Number.isSafeInteger(id) || id < 0)) {
            throw createInvalidRequestHttpException('Expected an array of non-negative integer IDs.');
        }
        return [...new Set(value as number[])].sort((a, b) => a - b);
    }

    /** Resolve mapping labels without creating catalogue entries or changing assignments. */
    async planImportTags(value: unknown, publicationId?: number): Promise<ImportTagPlan> {
        if (!Array.isArray(value) || value.some(label => typeof label !== 'string' || !label.trim())) {
            throw createInvalidRequestHttpException('tags must be an array of existing tag labels.', [
                { path: 'tags', code: 'array', message: 'Expected a list of non-empty tag labels.' },
            ]);
        }
        const labels = new Map<string, string>((value as string[]).map(label => [label.trim().toLowerCase(), label.trim()]));
        const matched = labels.size ? await this.source.getRepository(PublicationTag).createQueryBuilder('tag')
            .where('LOWER(BTRIM(tag.label)) IN (:...labels)', { labels: [...labels.keys()] }).getMany() : [];
        const current = publicationId === undefined ? [] : (await this.attach<Publication>([{ id: publicationId }]))[0].tags ?? [];
        const combined = new Map([...current, ...matched].map(tag => [tag.id, tag]));
        return {
            tags: [...combined.values()].sort((a, b) => a.label.localeCompare(b.label, 'de')),
            addTagIds: matched.filter(tag => !current.some(existing => existing.id === tag.id)).map(tag => tag.id!).sort((a, b) => a - b),
            missingLabels: [...labels].filter(([key]) => !matched.some(tag => tag.label.toLowerCase() === key)).map(([, label]) => label),
        };
    }

    async attach<T extends { id?: number; tags?: PublicationTag[] }>(publications: T[], manager = this.source.manager): Promise<T[]> {
        const ids = publications.map(publication => publication.id).filter((id): id is number => id !== undefined);
        if (!ids.length) return publications;
        const assignments = await manager.getRepository(PublicationTagAssignment).find({
            where: { publication_id: In(ids) }, relations: { tag: true }, order: { tag_id: 'ASC' },
        });
        const tags = new Map<number, PublicationTag[]>();
        for (const assignment of assignments) {
            if (!assignment.tag) continue;
            if (!tags.has(assignment.publication_id)) tags.set(assignment.publication_id, []);
            tags.get(assignment.publication_id)!.push(assignment.tag);
        }
        publications.forEach(publication => {
            publication.tags = (tags.get(publication.id!) ?? []).sort((a, b) => a.label.localeCompare(b.label, 'de'));
        });
        return publications;
    }

    /** Lock catalogue rows before publication rows in every assignment mutation. */
    async validateTags(ids: number[], manager: EntityManager): Promise<void> {
        if (!ids.length) return;
        const tags = await manager.getRepository(PublicationTag).createQueryBuilder('tag')
            .where('tag.id IN (:...ids)', { ids }).orderBy('tag.id').setLock('pessimistic_read').getMany();
        if (tags.length !== ids.length) throw createNotFoundHttpException('Tag not found. Refresh the tag selection.');
    }

    async lockPublications(ids: number[], user: string | undefined, manager: EntityManager): Promise<Publication[]> {
        if (!ids.length) return [];
        const publications = await manager.getRepository(Publication).createQueryBuilder('publication')
            .withDeleted().where('publication.id IN (:...ids)', { ids })
            .orderBy('publication.id').setLock('pessimistic_write').getMany();
        if (publications.length !== ids.length) throw createNotFoundHttpException('Publication not found.');
        const minutes = Number(await this.config.get('lock_timeout'));
        const timeout = (Number.isFinite(minutes) && minutes >= 0 ? minutes : 5) * 60000;
        for (const publication of publications) {
            if (publication.locked_at && !isExpiredEditLock(publication.locked_at, timeout)
                && (!user || EditLockOwnerStore.getOwner('publication', publication.id) !== user)) {
                throw createEntityLockedHttpException();
            }
        }
        return publications;
    }

    async replace(publicationId: number, tagIds: number[], manager: EntityManager): Promise<void> {
        const repo = manager.getRepository(PublicationTagAssignment);
        const previous = await repo.findBy({ publication_id: publicationId });
        const removed = previous.map(assignment => assignment.tag_id).filter(id => !tagIds.includes(id));
        const added = tagIds.filter(id => !previous.some(assignment => assignment.tag_id === id));
        if (removed.length) await repo.delete({ publication_id: publicationId, tag_id: In(removed) });
        if (added.length) await repo.insert(added.map(tag_id => ({ publication_id: publicationId, tag_id })));
    }

    assertAssignmentsEditable(publications: Publication[]): void {
        if (publications.some(publication => publication.locked)) {
            throw createEntityLockedHttpException('Tags of locked publications cannot be changed.');
        }
    }

    async mutate(value: PublicationTagMutation, user?: string) {
        const ids = this.ids(value?.publication_ids);
        const add = this.ids(value.add_tag_ids ?? []);
        const remove = this.ids(value.remove_tag_ids ?? []);
        if (add.some(id => remove.includes(id))) throw createInvalidRequestHttpException('Cannot add and remove the same tag.');
        return this.source.transaction(async manager => {
            await this.validateTags([...new Set([...add, ...remove])].sort((a, b) => a - b), manager);
            const publications = await this.lockPublications(ids, user, manager);
            this.assertAssignmentsEditable(publications);
            await this.attach(publications, manager);
            let updated = 0;
            for (const publication of publications) {
                const next = [...new Set([...(publication.tags ?? []).map(tag => tag.id!), ...add])].filter(id => !remove.includes(id));
                if (await this.change(publication, next, user, manager)) updated++;
            }
            return { updated };
        });
    }

    async delete(value: unknown, user?: string) {
        const ids = this.ids(value);
        if (!ids.length) return { deleted: 0 };
        return this.source.transaction(async manager => {
            const repo = manager.getRepository(PublicationTag);
            const tags = await repo.createQueryBuilder('tag').where('tag.id IN (:...ids)', { ids })
                .orderBy('tag.id').setLock('pessimistic_write').getMany();
            if (tags.length !== ids.length) throw createNotFoundHttpException('Tag not found.');
            const assignments = await manager.getRepository(PublicationTagAssignment).findBy({ tag_id: In(ids) });
            const publicationIds = [...new Set(assignments.map(a => a.publication_id))].sort((a, b) => a - b);
            const publications = await this.lockPublications(publicationIds, user, manager);
            this.assertAssignmentsEditable(publications);
            await this.attach(publications, manager);
            for (const publication of publications) {
                await this.change(publication, publication.tags!.map(tag => tag.id!).filter(id => !ids.includes(id)), user, manager);
            }
            await repo.delete(ids);
            return { deleted: ids.length };
        });
    }

    private async change(publication: Publication, next: number[], user: string | undefined, manager: EntityManager): Promise<boolean> {
        const previous = publication.tags ?? [];
        if (previous.length === next.length && previous.every(tag => next.includes(tag.id!))) return false;
        await this.replace(publication.id!, next, manager);
        const after = await this.attach<Publication>([{ id: publication.id }], manager);
        const snapshot = (tags: PublicationTag[]) => tags.map(tag => ({ id: tag.id, label: tag.label })).sort((a, b) => a.id! - b.id!);
        await manager.getRepository(PublicationChange).save({ publication: { id: publication.id }, timestamp: new Date(),
            by_user: user ? 'user' : undefined, dry_change: false,
            patch_data: { action: 'update', before: { tags: snapshot(previous) }, after: { tags: snapshot(after[0].tags ?? []) } } });
        await manager.getRepository(Publication).update(publication.id!, { edit_date: new Date() });
        return true;
    }

    async mutateInMerge(id: number, next: number[], manager: EntityManager): Promise<void> {
        const [publication] = await this.attach<Publication>([{ id }], manager);
        await this.change(publication, next, undefined, manager);
    }
}
