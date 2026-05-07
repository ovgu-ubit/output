import { AuthorPublication as IAuthorPublication } from '@output/interfaces';
import { Author } from "../../author/Author.entity";
import { Institute } from "../../institute/Institute.entity";
import { Publication } from "../core/Publication.entity";
import { Role } from "./Role.entity";
export declare class AuthorPublication implements IAuthorPublication {
    id?: number;
    authorId?: number;
    author?: Author;
    publicationId?: number;
    publication?: Publication;
    role?: Role;
    affiliation?: string;
    institute?: Institute;
    corresponding?: boolean;
}
