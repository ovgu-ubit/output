import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";
import { CostCenter as ICostCenter} from "../../../output-interfaces/Publication"

@Entity()
export class CostCenter implements ICostCenter {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    number: string;
    
    @Column()
    label: string;
}
