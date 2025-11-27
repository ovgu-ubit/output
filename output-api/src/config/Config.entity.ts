import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { Config as IConfig } from "../../../output-interfaces/Config";

export type ConfigScope = 'public' | 'user' | 'admin';

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

    @Column({ type: 'varchar', default: 'admin' })
    scope: ConfigScope;
}
