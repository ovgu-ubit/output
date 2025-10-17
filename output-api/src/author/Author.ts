import { Entity, PrimaryGeneratedColumn, Column, OneToMany, JoinColumn, ManyToOne, ManyToMany, JoinTable } from "typeorm";
import { AuthorPublication } from "../publication/relations/AuthorPublication";
import { Author as IAuthor} from "../../../output-interfaces/Publication"
import { Institute } from "../institute/Institute";
import { AliasAuthorFirstName } from "./AliasAuthorFirstName";
import { AliasAuthorLastName } from "./AliasAuthorLastName";

@Entity()
export class Author implements IAuthor {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    first_name: string;

    @Column()
    last_name: string;

    @Column({ nullable: true })
    title?: string;

    @ManyToMany(() => Institute, (inst) => inst.authors, {cascade: true})
    @JoinTable()
    institutes?: Institute[]

    @Column({ nullable: true })
    orcid?: string;

    @Column({ nullable: true })
    gnd_id?: string;

    @OneToMany(() => AuthorPublication, authorPublication => authorPublication.author, { cascade : true })
    authorPublications?: AuthorPublication[];

    @Column({ nullable: true, type: 'timestamptz' })
    locked_at?: Date;

    @OneToMany(() => AliasAuthorFirstName, ai => ai.element, { cascade : true })
    aliases_first_name?: AliasAuthorFirstName[];
    

    @OneToMany(() => AliasAuthorLastName, ai => ai.element, { cascade : true })
    aliases_last_name?: AliasAuthorLastName[];
}
