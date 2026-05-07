import { OA_Category as IOA_Category } from '@output/interfaces';
import { Publication } from "../publication/core/Publication.entity";
export declare class OA_Category implements IOA_Category {
    id?: number;
    label: string;
    is_oa: boolean;
    publications?: Publication[];
    locked_at?: Date;
}
