import { AliasInstitute as IAliasInstitute } from '@output/interfaces';
import { Institute } from "./Institute.entity";
declare const AliasInstituteBase: abstract new () => {
    element?: Institute;
    elementId?: number;
    alias: string;
};
export declare class AliasInstitute extends AliasInstituteBase implements IAliasInstitute {
}
export {};
