import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { ConfigColumnType, Config as IConfig } from "../../../output-interfaces/Config";

@Entity()
export class Config implements IConfig {
    @PrimaryGeneratedColumn()
    id?: number

    @Column()
    key: string;

    @Column({nullable: true})
    value: string | null;

    @Column({default:0})
    type?: ConfigColumnType;
}
