import { Entity, Column, ManyToOne, PrimaryColumn, JoinColumn, JoinTable } from "typeorm";
import { Author } from "./Author";
import { Publication } from "./Publication";
import { AuthorPublication as IAuthorPublication} from "../../../output-interfaces/Publication"
import { Institute } from "./Institute";

@Entity()
export class AuthorPublication implements IAuthorPublication {

    @PrimaryColumn()
    authorId:number;

    @ManyToOne(() => Author, author => author.authorPublications)
    @JoinColumn({
        name: 'authorId',
        referencedColumnName: 'id'
    })
    author?: Author

    @PrimaryColumn()
    publicationId:number;

    @ManyToOne(() => Publication, pub => pub.authorPublications)
    @JoinColumn({
        name: 'publicationId',
        referencedColumnName: 'id'
    })
    publication?: Publication

    @ManyToOne(() => Institute)
    @JoinTable()
    institute?: Institute

    @Column({ nullable: true })
    corresponding?: boolean;
}
