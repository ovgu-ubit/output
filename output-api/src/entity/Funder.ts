import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, OneToMany } from "typeorm";
import { Publication } from "./Publication";
import { Funder as IFunder} from "../../../output-interfaces/Publication"
import { AliasFunder } from "./alias/AliasFunder";

@Entity()
export class Funder implements IFunder {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    label: string;

    @Column({ unique: true, nullable: true })
    doi?: string;

    @Column({ nullable: true })
    third_party?: boolean;

    @ManyToMany(() => Publication, (pub) => pub.funders)
    publications?: Publication[]

    @OneToMany(() => AliasFunder, ai => ai.element, { cascade : true })
    aliases?: AliasFunder[];
    
    @Column({ nullable: true, type: 'timestamptz' })
    locked_at?: Date;
}
