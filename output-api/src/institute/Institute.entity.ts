import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, OneToMany, Tree, TreeChildren, TreeParent } from "typeorm";
import { Institute as IInstitute } from "../../../output-interfaces/Publication"
import { AuthorPublication } from "../publication/relations/AuthorPublication.entity";
import { AliasInstitute } from "./AliasInstitute.entity";
import { Author } from "../author/Author.entity";

@Entity()
@Tree("closure-table")
export class Institute implements IInstitute {

    @PrimaryGeneratedColumn()
    id?: number;

    @TreeParent()
    super_institute?: Institute

    @TreeChildren()
    sub_institutes?: Institute[]

    @Column()
    label: string;

    @Column({ nullable: true })
    short_label?: string;

    @Column({ nullable: true })
    opus_id?: string;

    @ManyToMany(() => Author, (author) => author.institutes)
    authors?: Author[]

    @OneToMany(() => AuthorPublication, authorPublication => authorPublication.institute, { cascade : true })
    authorPublications?: AuthorPublication[];

    @OneToMany(() => AliasInstitute, ai => ai.element, { cascade : true })
    aliases?: AliasInstitute[];

    @Column({ nullable: true, type: 'timestamptz' })
    locked_at?: Date;
}
