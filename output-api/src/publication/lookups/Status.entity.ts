import { Column, Entity, PrimaryColumn } from "typeorm";
import { Status as IStatus } from "../../../../output-interfaces/Publication";

@Entity()
export class Status implements IStatus {

    @PrimaryColumn()
    id?: number;

    @Column()
    label: string;

    @Column({ nullable: true})
    description: string;
    
    @Column({ nullable: true, type: 'timestamptz' })
    locked_at?: Date;
}
