import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from "typeorm";
import { Publisher } from "../publisher/Publisher";
import { Contract as IContract} from "../../../output-interfaces/Publication"
import { Publication } from "../publication/core/Publication";
import { ContractIdentifier } from "./ContractIdentifier";

@Entity()
export class Contract implements IContract {

    @PrimaryGeneratedColumn()
    id?: number;

    @ManyToOne(() => Publisher, (p) => p.id)
    publisher: Publisher

    @Column()
    label: string;

    @Column({ nullable: true, type: 'timestamptz'})
    start_date?: Date;

    @Column({ nullable: true, type: 'timestamptz' })
    end_date?: Date;

    @Column({ nullable: true })
    internal_number?: string;

    @Column({ nullable: true })
    invoice_amount?: number;

    @Column({ nullable: true })
    invoice_information?: string;

    @Column({ nullable: true })
    sec_pub?: string;

    @Column({ nullable: true })
    gold_option?: string;

    @Column({ nullable: true })
    verification_method?: string;

    @OneToMany(() => Publication, (p) => p.contract)
    publications?: Publication[];
    
    @OneToMany(() => ContractIdentifier, (ide) => ide.entity, {cascade: true})
    identifiers?: ContractIdentifier[];
    
    @Column({ nullable: true, type: 'timestamptz' })
    locked_at?: Date;
}
