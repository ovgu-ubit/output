import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";
import { CostCenter as ICostCenter} from "../../../output-interfaces/Publication"

@Entity()
export class CostCenter implements ICostCenter {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column({nullable: true})
    number?: string;
    
    @Column()
    label: string;
    
    @Column({ nullable: true, type: 'timestamptz' })
    locked_at?: Date;
}
