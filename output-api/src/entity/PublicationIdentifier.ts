import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique} from "typeorm";
import { PublicationIdentifier as IPublicationIdentifier } from "../../../output-interfaces/Publication"
import { Publication } from "./Publication";

@Entity()
@Unique(["type","value"])
export class PublicationIdentifier implements IPublicationIdentifier {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    type: string;

    @Column()
    value: string;

    @ManyToOne(() => Publication, (ge) => ge.id)
    entity?: Publication
}
