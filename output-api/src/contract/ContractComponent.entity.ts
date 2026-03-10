import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from "typeorm";
import { ContractModel, ContractComponent as IContractComponent } from "../../../output-interfaces/Publication"
import { Contract } from "./Contract.entity";
import { Invoice } from "../invoice/Invoice.entity";

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
}
