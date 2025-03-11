import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { PublicationIdentifier as IPublicationIdentifier } from "../../../output-interfaces/Publication";
import { Publication } from "./Publication";

@Entity()
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
