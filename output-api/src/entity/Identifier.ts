import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique} from "typeorm";
import { GreaterEntity } from "./GreaterEntity";
import { Identifier as IIdentifier } from "../../../output-interfaces/Publication"

@Entity()
@Unique(["type","value"])
export class Identifier implements IIdentifier {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    type: string;

    @Column()
    value: string;

    @ManyToOne(() => GreaterEntity, (ge) => ge.id)
    entity?: GreaterEntity
}
