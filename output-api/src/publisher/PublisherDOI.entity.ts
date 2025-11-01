import {Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn, PrimaryColumn} from "typeorm";
import { PublisherDOI as IPublisherDOI } from "../../../output-interfaces/Publication"
import { Publisher } from "./Publisher.entity";


@Entity()
export class PublisherDOI implements IPublisherDOI {

    @ManyToOne(() => Publisher, i => i.doi_prefixes, {
        orphanedRowAction: "delete"})
    @JoinColumn({
        name: 'publisherId',
        referencedColumnName: 'id'
    })
    publisher?: Publisher;

    @PrimaryColumn()
    publisherId?:number;

    @Column()
    @PrimaryColumn()
    doi_prefix: string;
}
