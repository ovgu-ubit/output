import { ContractIdentifier as IContractIdentifier } from '@output/interfaces';
import { Contract } from "./Contract.entity";
export declare class ContractIdentifier implements IContractIdentifier {
    id?: number;
    type: string;
    value: string;
    entity?: Contract;
}
