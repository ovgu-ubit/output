import { Role as IRole } from '@output/interfaces';
export declare class Role implements IRole {
    id?: number;
    label: string;
    locked_at?: Date;
}
