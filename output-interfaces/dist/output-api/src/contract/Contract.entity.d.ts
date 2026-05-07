import { Publisher } from "../publisher/Publisher.entity";
import { Contract as IContract } from '@output/interfaces';
import { Publication } from "../publication/core/Publication.entity";
import { ContractIdentifier } from "./ContractIdentifier.entity";
import { ContractComponent } from "./ContractComponent.entity";
export declare class Contract implements IContract {
    id?: number;
    publisher: Publisher;
    label: string;
    start_date?: Date;
    end_date?: Date;
    internal_number?: string;
    invoice_amount?: number;
    invoice_information?: string;
    sec_pub?: string;
    gold_option?: string;
    verification_method?: string;
    publications?: Publication[];
    identifiers?: ContractIdentifier[];
    locked_at?: Date;
    components?: ContractComponent[];
}
