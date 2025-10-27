import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { Config as IConfig } from "../../../output-interfaces/Config";

@Entity()
export class Config implements IConfig {
    @PrimaryGeneratedColumn()
    id?: number

    @Column()
    key: string;

    @Column({nullable: true})
    value: string | null;
}
