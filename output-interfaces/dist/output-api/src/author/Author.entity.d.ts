import { Author as IAuthor } from '@output/interfaces';
import { Institute } from "../institute/Institute.entity";
import { AuthorPublication } from "../publication/relations/AuthorPublication.entity";
import { AliasAuthorFirstName } from "./AliasAuthorFirstName.entity";
import { AliasAuthorLastName } from "./AliasAuthorLastName.entity";
export declare class Author implements IAuthor {
    id?: number;
    first_name: string;
    last_name: string;
    title?: string;
    institutes?: Institute[];
    orcid?: string;
    gnd_id?: string;
    authorPublications?: AuthorPublication[];
    locked_at?: Date;
    aliases_first_name?: AliasAuthorFirstName[];
    aliases_last_name?: AliasAuthorLastName[];
}
