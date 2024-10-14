import { Column, Entity, JoinColumn, JoinTable, ManyToOne, PrimaryColumn } from "typeorm";
import { AliasAuthorFirstName as IAliasAuthorFirstName} from "../../../../output-interfaces/Alias"
import { Author } from "../Author";

@Entity()
export class AliasAuthorFirstName implements IAliasAuthorFirstName {

    @ManyToOne(() => Author, i => i.aliases_first_name, {
        orphanedRowAction: "delete"})
    @JoinColumn({
        name: 'elementId',
        referencedColumnName: 'id'
    })
    element?: Author

    @PrimaryColumn()
    elementId:number;

    @Column()
    @PrimaryColumn()
    alias: string;
}