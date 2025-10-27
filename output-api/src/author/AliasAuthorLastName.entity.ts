import { Column, Entity, JoinColumn, JoinTable, ManyToOne, PrimaryColumn } from "typeorm";
import { AliasAuthorLastName as IAliasAuthorLastName} from "../../../output-interfaces/Alias"
import { Author } from "./Author.entity";

@Entity()
export class AliasAuthorLastName implements IAliasAuthorLastName {

    @ManyToOne(() => Author, i => i.aliases_last_name, {
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