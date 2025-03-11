import { Column, Entity, PrimaryColumn } from "typeorm";
import { Config as IConfig } from "../../../output-interfaces/Config";

@Entity()
export class Config implements IConfig {

    @PrimaryColumn()
    key: string;

    @Column({nullable: true})
    value: string;
}
