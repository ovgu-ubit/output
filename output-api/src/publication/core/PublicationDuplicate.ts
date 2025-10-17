import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { PublicationDuplicate as IPublicationDuplicate } from "../../../../output-interfaces/Publication";
import { Publication } from "./Publication";

@Entity()
export class PublicationDuplicate implements IPublicationDuplicate {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    id_first?: number;

    @ManyToOne(() => Publication, p => p.duplicates)
    @JoinColumn({
        name: 'id_first',
        referencedColumnName: 'id'
    })
    first?: Publication

    @Column()
    id_second?: number;

    @Column()
    description?: string;

    @DeleteDateColumn({ type: 'timestamptz' })
    delete_date?: Date;
}
