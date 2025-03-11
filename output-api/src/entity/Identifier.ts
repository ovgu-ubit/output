import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Identifier as IIdentifier } from "../../../output-interfaces/Publication";
import { GreaterEntity } from "./GreaterEntity";

@Entity()
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
