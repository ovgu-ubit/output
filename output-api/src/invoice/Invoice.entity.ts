import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from "typeorm";
import { CostCenter } from "./CostCenter.entity";
import { CostItem } from "./CostItem.entity";
import { Invoice as IInvoice, InvoiceKind } from "../../../output-interfaces/Publication"
import { Publication } from "../publication/core/Publication.entity";
import { ContractComponent } from "../contract/ContractComponent.entity";

@Entity()
export class Invoice implements IInvoice {

    @PrimaryGeneratedColumn()
    id?: number;

    @ManyToOne(() => CostCenter, (cc) => cc.id)
    cost_center?: CostCenter

    @OneToMany(() => CostItem, (ci) => ci.invoice, { cascade: true })
    cost_items?: CostItem[]

    @ManyToOne(() => Publication, (pub) => pub.invoices)
    publication?: Publication

    @ManyToOne(() => ContractComponent, (component) => component.linked_invoices)
    contract_component?: ContractComponent

    @Column({ type: 'enum', enum: InvoiceKind, default: InvoiceKind.INVOICE })
    invoice_kind?: InvoiceKind;

    @Column({ nullable: true })
    number?: string;

    @Column({ nullable: true })
    date?: Date;
    
    @Column({ nullable: true })
    booking_date?: Date;

    @Column({ type: "float", nullable: true })
    booking_amount?: number;
}
