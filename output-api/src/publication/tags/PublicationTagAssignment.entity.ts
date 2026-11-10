import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Publication } from '../core/Publication.entity';
import { PublicationTag } from './PublicationTag.entity';

@Entity('publication_tag_assignment')
@Index('IDX_publication_tag_assignment_tag', ['tag_id'])
export class PublicationTagAssignment {
    @PrimaryColumn()
    publication_id: number;

    @PrimaryColumn()
    tag_id: number;

    @ManyToOne(() => Publication, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'publication_id' })
    publication?: Publication;

    @ManyToOne(() => PublicationTag, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'tag_id' })
    tag?: PublicationTag;
}
