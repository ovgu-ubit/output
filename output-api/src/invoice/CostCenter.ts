import {Entity, PrimaryGeneratedColumn, Column, ManyToOne} from "typeorm";
import { CostCenter as ICostCenter} from "../../../output-interfaces/Publication"
import { Invoice } from "./Invoice";

@Entity()
export class CostCenter implements ICostCenter {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column({nullable: true})
    number?: string;
    
    @Column()
    label: string;

    @ManyToOne(() => Invoice, (inv) => inv.cost_center)
    invoices?: Invoice
    
    @Column({ nullable: true, type: 'timestamptz' })
    locked_at?: Date;
}
