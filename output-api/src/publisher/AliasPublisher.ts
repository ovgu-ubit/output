import { Column, Entity, JoinColumn, JoinTable, ManyToOne, PrimaryColumn } from "typeorm";
import { AliasPublisher as IAliasPublisher} from "../../../output-interfaces/Alias"
import { Publisher } from "./Publisher";

@Entity()
export class AliasPublisher implements IAliasPublisher {

    @ManyToOne(() => Publisher, i => i.aliases, {
        orphanedRowAction: "delete"})
    @JoinColumn({
        name: 'elementId',
        referencedColumnName: 'id'
    })
    element?: Publisher

    @PrimaryColumn()
    elementId:number;

    @Column()
    @PrimaryColumn()
    alias: string;
}