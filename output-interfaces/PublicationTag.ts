import { Publication } from './Publication';

export interface PublicationTag {
    id?: number;
    label: string;
    description?: string | null;
    color?: string | null;
}

export interface PublicationTagIndex extends PublicationTag {
    usage_count: number;
}

export interface PublicationWrite extends Publication {
    /** Omitted preserves assignments; [] removes all assignments. */
    tag_ids?: number[];
}

export interface PublicationTagMutation {
    publication_ids: number[];
    add_tag_ids?: number[];
    remove_tag_ids?: number[];
}
