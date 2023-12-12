import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique} from "typeorm";
import { Language as ILanguage } from "../../../output-interfaces/Publication"

@Entity()
export class Language implements ILanguage {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    label: string;
}
