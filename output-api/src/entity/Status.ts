import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { Status as IStatus} from "../../../output-interfaces/Publication"

@Entity()
export class Status implements IStatus {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    label: string;

    @Column()
    description: string;
    
    @Column({ nullable: true, type: 'timestamptz' })
    locked_at?: Date;
}
