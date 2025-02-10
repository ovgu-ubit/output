import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique} from "typeorm";
import { ContractIdentifier as IContractIdentifier } from "../../../output-interfaces/Publication"
import { Contract } from "./Contract";

@Entity()
@Unique(["type","value"])
export class ContractIdentifier implements IContractIdentifier {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    type: string;

    @Column()
    value: string;

    @ManyToOne(() => Contract, (ge) => ge.id)
    entity?: Contract
}
