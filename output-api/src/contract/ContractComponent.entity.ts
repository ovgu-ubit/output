import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, ManyToMany, JoinTable } from "typeorm";
import { ContractModel, ContractComponent as IContractComponent } from "../../../output-interfaces/Publication"
import { Contract } from "./Contract.entity";
import { Invoice } from "../invoice/Invoice.entity";
import { OA_Category } from "../oa_category/OA_Category.entity";
import { GreaterEntity } from "../greater_entity/GreaterEntity.entity";
import { Publication } from "../publication/core/Publication.entity";
import { PublicationType } from "../pub_type/PublicationType.entity";
import { CostType } from "../invoice/CostType.entity";

@Entity()
export class ContractComponent implements IContractComponent {

    @PrimaryGeneratedColumn()
    id?: number;

    @ManyToOne(() => Contract, (p) => p.id)
    contract: Contract;

    @Column()
    label: string;

    @Column({ nullable: true, type: 'enum', enum: ContractModel })
    contract_model?: ContractModel;

    @Column({ type: 'int' })
    contract_model_version?: number;

    @Column({ nullable: true, type: 'jsonb' })
    contract_model_params?: unknown;

    @OneToMany(() => Invoice, (i) => i.contract_component, { cascade: true })
    invoices?: Invoice[]

    @OneToMany(() => Invoice, (i) => i.contract_component, { cascade: true })
    pre_invoices?: Invoice[]

    @ManyToMany(() => OA_Category)
    @JoinTable()
    oa_categories?: OA_Category[];

    @ManyToMany(() => PublicationType)
    @JoinTable()
    pub_types?: PublicationType[];

    @ManyToMany(() => GreaterEntity)
    @JoinTable()
    greater_entities?: GreaterEntity[];

    @ManyToMany(() => CostType)
    @JoinTable()
    cost_types?: CostType[];
}
