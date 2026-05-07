import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";
import {  CostType as ICostType } from '@output/interfaces'

@Entity()
export class CostType implements ICostType {

    @PrimaryGeneratedColumn()
    id?: number;
    
    @Column()
    label: string;
    
    @Column({ nullable: true, type: 'timestamptz' })
    locked_at?: Date;
}
