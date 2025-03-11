import { Entity, PrimaryGeneratedColumn, Column, OneToMany, JoinColumn, ManyToOne, ManyToMany, JoinTable } from "typeorm";
import { AuthorPublication } from "./AuthorPublication";
import { Institute } from "./Institute";
import { Author as IAuthor} from "../../../output-interfaces/Publication"
import { AliasAuthorFirstName } from "./alias/AliasAuthorFirstName";
import { AliasAuthorLastName } from "./alias/AliasAuthorLastName";

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

    @Column({ nullable: true })
    gnd_id?: string;

    @ManyToMany(() => Institute, (inst) => inst.authors, {cascade: true})
    @JoinTable()
    institutes?: Institute[]

    @Column({ nullable: true })
    orcid?: string;

    @OneToMany(() => AuthorPublication, authorPublication => authorPublication.author, { cascade : true })
    authorPublications?: AuthorPublication[];

    @Column({ nullable: true, type: 'timestamptz' })
    locked_at?: Date;

    @OneToMany(() => AliasAuthorFirstName, ai => ai.element, { cascade : true })
    aliases_first_name?: AliasAuthorFirstName[];
    

    @OneToMany(() => AliasAuthorLastName, ai => ai.element, { cascade : true })
    aliases_last_name?: AliasAuthorLastName[];
}
