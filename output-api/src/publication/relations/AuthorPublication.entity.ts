import { Entity, Column, ManyToOne, PrimaryColumn, JoinColumn, JoinTable, PrimaryGeneratedColumn } from "typeorm";
import { AuthorPublication as IAuthorPublication} from "../../../../output-interfaces/Publication"
import { Role } from "./Role.entity";
import { Institute } from "../../institute/Institute.entity";
import { Author } from "../../author/Author.entity";
import { Publication } from "../core/Publication.entity";

@Entity()
export class AuthorPublication implements IAuthorPublication {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    authorId:number;

    @ManyToOne(() => Author, author => author.authorPublications)
    @JoinColumn({
        name: 'authorId',
        referencedColumnName: 'id'
    })
    author?: Author

    @Column()
    publicationId:number;

    @ManyToOne(() => Publication, pub => pub.authorPublications)
    @JoinColumn({
        name: 'publicationId',
        referencedColumnName: 'id'
    })
    publication?: Publication

    @ManyToOne(() => Role)
    @JoinTable()
    role?: Role

    @Column({ nullable: true })
    affiliation?: string;

    @ManyToOne(() => Institute)
    @JoinTable()
    institute?: Institute

    @Column({ nullable: true })
    corresponding?: boolean;
}
