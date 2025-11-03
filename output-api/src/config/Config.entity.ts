import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { Config as IConfig } from "../../../output-interfaces/Config";

@Entity()
export class Config implements IConfig {
    @PrimaryGeneratedColumn()
    id?: number

    @Column({unique: true})
    key: string;

    @Column({nullable: true, type: 'simple-json'})
    value: any;
    
    @Column({nullable: true})
    description?: string;
}
