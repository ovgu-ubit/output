import { Column, Entity, JoinColumn, JoinTable, ManyToOne, PrimaryColumn } from "typeorm";
import { Institute } from "../Institute";
import { AliasFunder as IAliasFunder} from "../../../../output-interfaces/Alias"
import { Funder } from "../Funder";

@Entity()
export class AliasFunder implements IAliasFunder {

    @ManyToOne(() => Funder, i => i.aliases, {
        orphanedRowAction: "delete"})
    @JoinColumn({
        name: 'elementId',
        referencedColumnName: 'id'
    })
    element: Institute

    @PrimaryColumn()
    elementId:number;

    @Column()
    @PrimaryColumn()
    alias: string;
}