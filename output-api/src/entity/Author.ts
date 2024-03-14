import { Entity, PrimaryGeneratedColumn, Column, OneToMany, JoinColumn, ManyToOne, ManyToMany, JoinTable } from "typeorm";
import { AuthorPublication } from "./AuthorPublication";
import { Institute } from "./Institute";
import { Author as IAuthor} from "../../../output-interfaces/Publication"

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

    @Column({ nullable: true, unique: true })
    gnd_id?: string;

    @ManyToMany(() => Institute, (inst) => inst.authors, {cascade: true})
    @JoinTable()
    institutes?: Institute[]

    @Column({ nullable: true })
    orcid?: string;

    @Column({ nullable: true })
    valid_from?: Date;

    @OneToMany(() => AuthorPublication, authorPublication => authorPublication.author, { cascade : true })
    authorPublications?: AuthorPublication[];

    @Column({ nullable: true, type: 'timestamptz' })
    locked_at?: Date;
}
