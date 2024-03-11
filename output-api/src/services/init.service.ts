import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Author } from "../entity/Author";
import { AuthorPublication } from "../entity/AuthorPublication";
import { Config } from "../entity/Config";
import { Contract } from "../entity/Contract";
import { CostCenter } from "../entity/CostCenter";
import { CostItem } from "../entity/CostItem";
import { CostType } from "../entity/CostType";
import { Funder } from "../entity/Funder";
import { GreaterEntity } from "../entity/GreaterEntity";
import { Identifier } from "../entity/Identifier";
import { Institute } from "../entity/Institute";
import { Invoice } from "../entity/Invoice";
import { OA_Category } from "../entity/OA_Category";
import { Publication } from "../entity/Publication";
import { PublicationType } from "../entity/PublicationType";
import { Publisher } from "../entity/Publisher";
import { AliasInstitute } from "../entity/alias/AliasInstitute";
import { AliasPublisher } from "../entity/alias/AliasPublisher";
import { AliasPubType } from "../entity/alias/AliasPubType";
import { AliasFunder } from "../entity/alias/AliasFunder";
import { Language } from "../entity/Language";
import { PublisherDOI } from "../entity/PublisherDOI";

@Injectable()
export class InitService {

    constructor(@InjectConnection() protected dataSource: DataSource,
        @InjectRepository(Publication) protected publicationRepository: Repository<Publication>,
        @InjectRepository(Author) protected authorRepository: Repository<Author>,
        @InjectRepository(AuthorPublication) protected autPubRepository: Repository<AuthorPublication>,
        @InjectRepository(PublicationType) protected publicationTypeRepository: Repository<PublicationType>,
        @InjectRepository(CostType) protected costTypeRepository: Repository<CostType>,
        @InjectRepository(Funder) protected funderRepository: Repository<Funder>,
        @InjectRepository(Institute) protected instituteRepository: Repository<Institute>,
        @InjectRepository(CostCenter) protected costCenterRepository: Repository<CostCenter>,
        @InjectRepository(OA_Category) protected oaCategoryRepository: Repository<OA_Category>,
        @InjectRepository(GreaterEntity) protected greaterEntityRepository: Repository<GreaterEntity>,
        @InjectRepository(Publisher) protected publisherRepository: Repository<Publisher>,
        @InjectRepository(PublisherDOI) protected publisherDOIRepository: Repository<PublisherDOI>,
        @InjectRepository(Contract) protected contractRepository: Repository<Contract>,
        @InjectRepository(Config) protected configRepository: Repository<Config>,
        @InjectRepository(AliasInstitute) protected aliasInstRep: Repository<AliasInstitute>,
        @InjectRepository(AliasPublisher) protected aliasPublRep: Repository<AliasPublisher>,
        @InjectRepository(AliasPubType) protected aliasPubType: Repository<AliasPubType>,
        @InjectRepository(AliasFunder) protected aliasFunder: Repository<AliasFunder>,
        @InjectRepository(Language) protected langRepository: Repository<Language>) { this.init(); }

    public async init() {
        // Drop database schema:
        await this.dataSource.synchronize(true);

        // Init values:   

        let oas: OA_Category[] = [
            { label: 'Diamond', is_oa: true },
            { label: 'Gold', is_oa: true },
            { label: 'Hybrid', is_oa: true },
            { label: 'Green', is_oa: true },
            { label: 'Closed', is_oa: false },
            { label: 'Bronze', is_oa: false },
        ]
        await this.addPubType();
        await this.addPubl();
        await this.addFunder();
        await this.addInst();

        let apc: CostType[] = [
            { label: 'Article Processing Charges' },
            { label: 'Book Processing Charges' },
            { label: 'Colour Charges' },
            { label: 'Extra Page Charges' },
        ]

        let config: Config[] = [
            { key: 'reporting_year', value: '2022' }
        ]

        let langs: Language[] = [
            { label: 'de' },
            { label: 'en' },
            { label: 'es' },
            { label: 'fr' },
            { label: 'ru' },
            { label: 'Sonstige' },
        ]

        // Save entities to database
        await this.oaCategoryRepository.save(oas);
        await this.costTypeRepository.save(apc);
        await this.configRepository.save(config);
        await this.langRepository.save(langs);
    }

    async addFunder() {
        let funder: Funder = {
            label: 'DFG'
        }
        funder = await this.funderRepository.save(funder);
        let alias = ["dfg", "deutsche forschungsgemeinschaft", "german research foundation"];
        await this.aliasFunder.save(alias.map(a => { return { element: funder, alias: a } }))
    }

    async addPubType() {
        let pt = { label: 'Konferenzbeitrag: Paper', review: true };
        pt = await this.publicationTypeRepository.save(pt);
        let alias = ["proceeding"];
        await this.aliasPubType.save(alias.map(a => { return { element: pt, alias: a } }))

        pt = { label: 'Artikel Journalartikel', review: true };
        pt = await this.publicationTypeRepository.save(pt);
        alias = ["article", "letter", "erratum"];
        await this.aliasPubType.save(alias.map(a => { return { element: pt, alias: a } }))

        pt = { label: 'Artikel Sammelbandbeitrag', review: true };
        pt = await this.publicationTypeRepository.save(pt);
        alias = ["chapter", "inbook"];
        await this.aliasPubType.save(alias.map(a => { return { element: pt, alias: a } }))

        pt = { label: 'Buch Monografie', review: false };
        pt = await this.publicationTypeRepository.save(pt);
        alias = ["book", "monograph"];
        await this.aliasPubType.save(alias.map(a => { return { element: pt, alias: a } }))

        pt = { label: 'Buch Dissertation', review: true };
        pt = await this.publicationTypeRepository.save(pt);
        alias = ["dissertation", "phdthesis", "habilitation"];
        await this.aliasPubType.save(alias.map(a => { return { element: pt, alias: a } }))

        pt = { label: 'Sonderheft Zeitschrift', review: false };
        pt = await this.publicationTypeRepository.save(pt);
        alias = ["editorial"];
        await this.aliasPubType.save(alias.map(a => { return { element: pt, alias: a } }))

        pt = { label: 'Arbeitspapier/Forschungsbericht', review: false };
        pt = await this.publicationTypeRepository.save(pt);
        alias = ["report"];
        await this.aliasPubType.save(alias.map(a => { return { element: pt, alias: a } }))

        pt = { label: 'Forschungsdaten', review: false };
        pt = await this.publicationTypeRepository.save(pt);
        alias = ["dataset","case reports"];
        await this.aliasPubType.save(alias.map(a => { return { element: pt, alias: a } }))

        pt = { label: 'Artikel Preprint', review: false };
        pt = await this.publicationTypeRepository.save(pt);
        alias = ["preprint","manuscript"];
        await this.aliasPubType.save(alias.map(a => { return { element: pt, alias: a } }))

        let article: PublicationType[] = [
            { label: 'Buch Sammelband', review: false },
            { label: 'Buch Konferenzband', review: false },
            { label: 'Konferenzbeitrag: Poster', review: true },
            { label: 'Konferenzbeitrag: Präsentation', review: false },
            { label: 'Konferenzbeitrag: Meeting Abstract', review: false },
            { label: 'Beitrag in nicht-wissenschaftlichen Medien', review: true },
            { label: 'Beitrag in wissenschaftlichen Blogs', review: false },
            { label: 'Integrierende Ressourcen', review: false },
            { label: 'Sonstige Publikationen', review: false },
            { label: 'nicht ermittelbar', review: null }
        ]
        await this.publicationTypeRepository.save(article);
    }

    async addPubl() {
        let publ: Publisher = {
            label: 'Springer Nature',
            location: 'London/Heidelberg'
        }
        publ = await this.publisherRepository.save(publ);
        let alias = ["springer", "nature", "biomed central", "embo", "science china press", "verl. für sozialwissenschaften", "vieweg", "vs verlag für sozialwissenschaften"];
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        let doi_prefixes = ['10.1007', '10.1023', '10.1038', '10.1065', '10.1114', '10.1186', '10.1245', '10.1251', '10.1361', '10.1365', '10.1379', '10.1381', '10.1385', 
        '10.1617', '10.1891', '10.3758', '10.4076', '10.4098', '10.4333', '10.5052', '10.5819', '10.7603'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'Wiley',
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["wiley", "american geophysical union"];
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.1002', '10.1034', '10.1046', '10.1111', '10.1113', '10.1196', '10.1256', '10.1301', '10.1348', '10.1359', '10.1506', '10.1516', 
        '10.1526', '10.1576', '10.1581', '10.1892', '10.1897', '10.2746', '10.2755', '10.2966', '10.3162', '10.3170', '10.3322', '10.3401', '10.3405', '10.4004', '10.5054'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'MDPI'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["mdpi", "molecular diversity preservation international"];
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.3390']
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'IEEE',
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["ieee", "institute of electrical and electronics engineering"];
        doi_prefixes = ['10.1109'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        publ = {
            label: 'ACM',
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["acm", "association for computing"];
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.1145'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'DeGruyter'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["gruyter", "transcript"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.1515', '10.3884'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'Taylor & Francis',
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["taylor", "routledge", "cass", "informa uk limited"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.1080', '10.1531'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'Thieme'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["thieme"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.1055'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'Deutsche Gesellschaft für Akustik e.V. (DEGA)'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["deutsche gesellschaft für akustik"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        publ = {
            label: 'Deutsches Zentrum für Luft- und Raumfahrt (DLR)'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["deutsches zentrum für luft- und raumfahrt", "dlr"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        publ = {
            label: 'Frontiers Media'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["frontiers media", "frontiers research foundation"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.2741','10.3389','10.4175'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'Hogrefe'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["hogrefe"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.1024','10.1026','10.1027'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))
        
        publ = {
            label: 'North-Holland'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["north-holland"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        publ = {
            label: 'Ökom-Verlag'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["ökom", "oekom"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        publ = {
            label: 'Oxford University Press',
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["oxford univ", "oup", "endocrine society"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.1093','10.1112'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'SCITEPRESS'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["scitepress"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.5220'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'Stumpf & Kossendey'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["kossendey"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        publ = {
            label: 'VDE Verlag'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["vde verlag"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        publ = {
            label: 'VDI Verlag'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["vdi verlag"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        publ = {
            label: 'wbv Media'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["wbv"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        publ = {
            label: 'World Scientific Publishing'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["world scientific pub"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.1142'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'OVGU'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["guericke", "universitätsbibliothek magdeburg"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.24352'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'Elsevier',
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["elsevier", "academic press", "cell press", "churchill livingstone", "lancet publ", "science direct"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.1006', '10.1016', '10.1053', '10.1054', '10.1067', '10.1078', '10.1157', '10.1197', '10.1205', '10.1240', '10.1367', '10.1383', 
        '10.1529', '10.1580', '10.1602', '10.2353', '10.3182', '10.3816', '10.3921', '10.4065'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'BMJ Publishing Group'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["bmj p", "bmj journal"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.1136'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'Brill'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["böhlau", "vandenhoeck", "brill"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.1163', '10.2959'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'Wolters Kluwer'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["carl link", "wolters kluwer"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.1097', '10.1161', '10.1203', '10.1212', '10.1213', '10.1227', '10.1249', '10.1288', '10.1519', '10.2165', '10.2459', '10.7123'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'Cambridge University Press'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["cambridge univ", "cup"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.1017', '10.1375', '10.1557', '10.3815', '10.4039', '10.5948', '10.5949', '10.7135', '10.7313'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'Klett-Cotta'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["klett-cotta", "schattauer"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        
        publ = {
            label: 'JSTOR'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["jstor", "journal storage"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.2307'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'American Chemical Society (ACS)'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["american chemical society"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.1021'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'Sage Publications'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["sage"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.1106', '10.1177', '10.1528', '10.1622', '10.1630', '10.2968', '10.3317', '10.4135', '10.4219'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))
    }

    addInst() {

    }
}
