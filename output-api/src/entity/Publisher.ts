import {Entity, PrimaryGeneratedColumn, Column, OneToMany} from "typeorm";
import { Publisher as IPublisher } from "../../../output-interfaces/Publication"
import { Publication } from "./Publication";
import { AliasPublisher } from "./alias/AliasPublisher";

@Entity()
export class Publisher implements IPublisher {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    label: string;
    
    @Column({ nullable: true })
    location?: string;
    
    @OneToMany(() => Publication, (p) => p.publisher)
    publications?: Publication[];
    
    @OneToMany(() => AliasPublisher, ai => ai.element, { cascade : true })
    aliases?: AliasPublisher[];
}
