import { Institute as IInstitute } from '@output/interfaces';
import { AuthorPublication } from "../publication/relations/AuthorPublication.entity";
import { AliasInstitute } from "./AliasInstitute.entity";
import { Author } from "../author/Author.entity";
export declare class Institute implements IInstitute {
    id?: number;
    super_institute?: Institute;
    sub_institutes?: Institute[];
    label: string;
    short_label?: string;
    opus_id?: string;
    authors?: Author[];
    authorPublications?: AuthorPublication[];
    aliases?: AliasInstitute[];
    locked_at?: Date;
}
