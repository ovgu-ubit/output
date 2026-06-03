import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import {  PublicationSupplement as IPublicationSupplement  } from '@output/interfaces';
import { Publication } from "./Publication.entity";

@Entity()
export class PublicationSupplement implements IPublicationSupplement {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    link: string;

    @ManyToOne(() => Publication, (ge) => ge.id)
    publication?: Publication
}
