import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, ManyToOne, OneToMany } from "typeorm";
import { Contract } from "../contract/Contract";
import { CostCenter } from "./CostCenter";
import { CostItem } from "./CostItem";
import { Invoice as IInvoice } from "../../../output-interfaces/Publication"
import { Publication } from "../publication/Publication";

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

    @Column({ nullable: true })
    number?: string;

    @Column({ nullable: true })
    date?: Date;
    
    @Column({ nullable: true })
    booking_date?: Date;

    @Column({ type: "float", nullable: true })
    booking_amount?: number;
}
