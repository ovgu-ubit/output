import { Column, Entity, JoinColumn, JoinTable, ManyToOne, PrimaryColumn } from "typeorm";
import { AliasPubType as IAliasPubType} from "../../../../output-interfaces/Alias"
import { PublicationType } from "../PublicationType";

@Entity()
export class AliasPubType implements IAliasPubType {

    @ManyToOne(() => PublicationType, i => i.aliases, {
        orphanedRowAction: "delete"})
    @JoinColumn({
        name: 'elementId',
        referencedColumnName: 'id'
    })
    element?: PublicationType

    @PrimaryColumn()
    elementId:number;

    @Column()
    @PrimaryColumn()
    alias: string;
}