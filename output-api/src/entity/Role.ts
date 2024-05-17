import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { Role as IRole} from "../../../output-interfaces/Publication"

@Entity()
export class Role implements IRole {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    label: string;
}
