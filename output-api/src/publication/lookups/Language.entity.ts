import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import {  Language as ILanguage  } from '@output/interfaces';

@Entity()
export class Language implements ILanguage {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    label: string;
}
