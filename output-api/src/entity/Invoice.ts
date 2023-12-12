import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, ManyToOne, OneToMany } from "typeorm";
import { Contract } from "./Contract";
import { CostCenter } from "./CostCenter";
import { CostItem } from "./CostItem";
import { Publication } from "./Publication";
import { Invoice as IInvoice } from "../../../output-interfaces/Publication"

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
