import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, OneToMany } from "typeorm";
import { Funder as IFunder} from "../../../output-interfaces/Publication"
import { AliasFunder } from "./alias/AliasFunder";
import { Publication } from "../publication/Publication";

@Entity()
export class Funder implements IFunder {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    label: string;

    @Column({ nullable: true })
    doi?: string;

    @Column({ nullable: true })
    ror_id?: string;

    @Column({ nullable: true })
    third_party?: boolean;

    @ManyToMany(() => Publication, (pub) => pub.funders)
    publications?: Publication[]

    @OneToMany(() => AliasFunder, ai => ai.element, { cascade : true })
    aliases?: AliasFunder[];
    
    @Column({ nullable: true, type: 'timestamptz' })
    locked_at?: Date;
}
