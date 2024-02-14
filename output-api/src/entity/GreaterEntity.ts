import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from "typeorm";
import { GreaterEntity as IGreaterEntity } from "../../../output-interfaces/Publication"
import { Identifier } from "./Identifier";
import { Publication } from "./Publication";

@Entity()
export class GreaterEntity implements IGreaterEntity {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    label: string;

    @Column({ nullable: true })
    rating?: string;

    @Column({ nullable: true })
    is_doaj?: boolean;

    @OneToMany(() => Identifier, (ide) => ide.entity, {cascade: true})
    identifiers?: Identifier[];

    @OneToMany(() => Publication, (p) => p.greater_entity)
    publications?: Publication[]
    
    @Column({ nullable: true, type: 'timestamptz' })
    locked_at?: Date;
}
