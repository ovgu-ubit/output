import {Entity, PrimaryGeneratedColumn, Column, OneToMany} from "typeorm";
import { OA_Category as IOA_Category } from "../../../output-interfaces/Publication"
import { Publication } from "../publication/core/Publication.entity";

@Entity()
export class OA_Category implements IOA_Category{

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    label: string;

    @Column({ nullable: true })
    is_oa: boolean;

    @OneToMany(() => Publication, (p) => p.oa_category)
    publications?: Publication[]
    
    @Column({ nullable: true, type: 'timestamptz' })
    locked_at?: Date;
}
