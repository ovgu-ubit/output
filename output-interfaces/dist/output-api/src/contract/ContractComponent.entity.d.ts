import { ContractModel, ContractComponent as IContractComponent } from '@output/interfaces';
import { GreaterEntity } from "../greater_entity/GreaterEntity.entity";
import { CostType } from "../invoice/CostType.entity";
import { Invoice } from "../invoice/Invoice.entity";
import { OA_Category } from "../oa_category/OA_Category.entity";
import { PublicationType } from "../pub_type/PublicationType.entity";
import { Contract } from "./Contract.entity";
export declare class ContractComponent implements IContractComponent {
    id?: number;
    contract?: Contract;
    label?: string;
    contract_model?: ContractModel;
    contract_model_version?: number;
    contract_model_params?: unknown;
    linked_invoices?: Invoice[];
    invoices?: Invoice[];
    pre_invoices?: Invoice[];
    oa_categories?: OA_Category[];
    pub_types?: PublicationType[];
    greater_entities?: GreaterEntity[];
    cost_types?: CostType[];
}
