import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, ManyToMany, JoinTable, UpdateDateColumn, CreateDateColumn, DeleteDateColumn } from "typeorm";
import { AuthorPublication } from "./AuthorPublication";
import { Contract } from "./Contract";
import { Funder } from "./Funder";
import { GreaterEntity } from "./GreaterEntity";
import { Invoice } from "./Invoice";
import { OA_Category } from "./OA_Category";
import { PublicationType } from "./PublicationType";
import { Publisher } from "./Publisher";
import { Publication as IPublication } from "../../../output-interfaces/Publication"
import { Language } from "./Language";

@Entity()
export class Publication implements IPublication {

    @PrimaryGeneratedColumn()
    id?: number;

    @OneToMany(() => AuthorPublication, authorPublication => authorPublication.publication, { cascade: true })
    authorPublications?: AuthorPublication[];

    @ManyToOne(() => PublicationType, pub => pub.id)
    pub_type?: PublicationType

    @ManyToOne(() => OA_Category, oa => oa.id)
    oa_category?: OA_Category

    @ManyToOne(() => GreaterEntity, ge => ge.id)
    greater_entity?: GreaterEntity

    @ManyToOne(() => Publisher, p => p.id)
    publisher?: Publisher

    @ManyToOne(() => Contract, c => c.id)
    contract?: Contract

    @ManyToMany(() => Funder, (f) => f.publications)
    @JoinTable()
    funders?: Funder[]

    @OneToMany(() => Invoice, (i) => i.publication, { cascade: true })
    invoices?: Invoice[]

    @Column()
    authors?: string;

    @Column()
    title?: string;

    @Column({ nullable: true })
    doi?: string;

    @Column({ nullable: true,  type: 'timestamptz' })
    pub_date?: Date;

    @Column({ nullable: true })
    link?: string;

    @Column()
    dataSource?: string;
    
    @ManyToOne(() => Language, c => c.id)
    language?: Language

    @Column({ nullable: true })
    second_pub?: string;

    @Column({
        default: ''
    })
    add_info?: string;

    @CreateDateColumn({type: 'timestamptz'})
    import_date?: Date;

    @UpdateDateColumn({type: 'timestamptz'})
    edit_date?: Date;

    @DeleteDateColumn({type: 'timestamptz'})
    delete_date?: Date;

    @Column({
        default: false
    })
    locked?: boolean

    @Column({
        default: 0
    })
    status?: number

    //OA fields filled by unpaywall
    @Column({ nullable: true })
    is_oa?: boolean;
    @Column({ nullable: true })
    oa_status?: string;
    @Column({ nullable: true })
    is_journal_oa?: boolean;
    @Column({ nullable: true })
    best_oa_host?: string;
    @Column({ nullable: true })
    best_oa_license?: string;

    @Column({ nullable: true, type: 'timestamptz' })
    locked_at?: Date;
}
