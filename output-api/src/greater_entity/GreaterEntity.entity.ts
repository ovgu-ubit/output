import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from "typeorm";
import { GreaterEntity as IGreaterEntity } from "../../../output-interfaces/Publication"
import { Publication } from "../publication/core/Publication.entity";
import { GEIdentifier } from "./GEIdentifier.entity";

@Entity()
export class GreaterEntity implements IGreaterEntity {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    label: string;

    @Column({ nullable: true })
    rating?: string;

    @Column({ nullable: true, type: 'timestamptz' })
    doaj_since?: Date;

    @Column({ nullable: true, type: 'timestamptz' })
    doaj_until?: Date;

    @OneToMany(() => GEIdentifier, (ide) => ide.entity, {cascade: true})
    identifiers?: GEIdentifier[];

    @OneToMany(() => Publication, (p) => p.greater_entity)
    publications?: Publication[]
    
    @Column({ nullable: true, type: 'timestamptz' })
    locked_at?: Date;
}
