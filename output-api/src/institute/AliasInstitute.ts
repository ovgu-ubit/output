import { Column, Entity, JoinColumn, JoinTable, ManyToOne, PrimaryColumn } from "typeorm";
import { AliasInstitute as IAliasInstitute} from "../../../output-interfaces/Alias"
import { Institute } from "./Institute";

@Entity()
export class AliasInstitute implements IAliasInstitute {

    @ManyToOne(() => Institute, i => i.aliases, {
        orphanedRowAction: "delete"})
    @JoinColumn({
        name: 'elementId',
        referencedColumnName: 'id'
    })
    element?: Institute

    @PrimaryColumn()
    elementId:number;

    @Column()
    @PrimaryColumn()
    alias: string;
}