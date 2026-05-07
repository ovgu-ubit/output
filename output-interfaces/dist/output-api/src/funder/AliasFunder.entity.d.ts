import { AliasFunder as IAliasFunder } from '@output/interfaces';
import { Funder } from "./Funder.entity";
declare const AliasFunderBase: abstract new () => {
    element?: Funder;
    elementId?: number;
    alias: string;
};
export declare class AliasFunder extends AliasFunderBase implements IAliasFunder {
}
export {};
