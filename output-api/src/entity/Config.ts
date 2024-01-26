import {Entity, PrimaryGeneratedColumn, Column, Unique, PrimaryColumn} from "typeorm";
import { Config as IConfig } from "../../../output-interfaces/Config"

@Entity()
export class Config implements IConfig {

    @PrimaryColumn()
    key: string;

    @Column()
    value: string;
}
