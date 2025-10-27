import {Entity, PrimaryGeneratedColumn, Column, ManyToOne} from "typeorm";
import { CostType } from "./CostType.entity";
import { Invoice } from "./Invoice.entity";
import { CostItem as ICostItem} from "../../../output-interfaces/Publication"

@Entity()
export class CostItem implements ICostItem {

    @PrimaryGeneratedColumn()
    id?: number;
    
    @Column({ nullable: true })
    label?: string;

    @ManyToOne(() => Invoice, i => i.cost_items)
    invoice?: Invoice
    
    @ManyToOne(() => CostType, ct => ct.id)
    cost_type?: CostType

    @Column({ type: "float", nullable: true })
    euro_value?: number;

    @Column({ type: "float", nullable: true })
    orig_value?: number;
    
    @Column({ nullable: true })
    orig_currency?: string;

    @Column({ type: "float", nullable: true })
    normal_price?: number;

    @Column({ type: "float", nullable: true })
    vat?: number;
}
