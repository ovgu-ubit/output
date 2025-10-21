import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { GEIdentifier as IIdentifier } from "../../../output-interfaces/Publication";
import { GreaterEntity } from "./GreaterEntity";

@Entity("identifier")
export class GEIdentifier implements IIdentifier {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    type: string;

    @Column()
    value: string;

    @ManyToOne(() => GreaterEntity, (ge) => ge.id)
    entity?: GreaterEntity
}
