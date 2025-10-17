import {Entity, PrimaryGeneratedColumn, Column, OneToMany} from "typeorm";
import { Publisher as IPublisher } from "../../../output-interfaces/Publication"
import { AliasPublisher } from "./alias/AliasPublisher";
import { PublisherDOI } from "./PublisherDOI";
import { Publication } from "../publication/Publication";

@Entity()
export class Publisher implements IPublisher {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    label: string;

    @OneToMany(() => PublisherDOI, (p) => p.publisher, { cascade : true })
    doi_prefixes?: PublisherDOI[];
    
    @OneToMany(() => Publication, (p) => p.publisher)
    publications?: Publication[];
    
    @OneToMany(() => AliasPublisher, ai => ai.element, { cascade : true })
    aliases?: AliasPublisher[];
    
    @Column({ nullable: true, type: 'timestamptz' })
    locked_at?: Date;
}
