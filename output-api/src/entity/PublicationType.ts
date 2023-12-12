import {Entity, PrimaryGeneratedColumn, Column, OneToMany} from "typeorm";
import { PublicationType as IPublicationType } from "../../../output-interfaces/Publication"
import { Publication } from "./Publication";
import { AliasPubType } from "./alias/AliasPubType";

@Entity()
export class PublicationType implements IPublicationType {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    label: string;

    @Column({ nullable: true })
    review: boolean;

    @OneToMany(() => Publication, (p) => p.pub_type)
    publications?: Publication[]
    
    @OneToMany(() => AliasPubType, ai => ai.element, { cascade : true })
    aliases?: AliasPubType[];
}
