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
import { InitService } from "./init.service";
import { PublisherDOI } from "../entity/PublisherDOI";
import { Role } from "../entity/Role";

@Injectable()
export class InitOVGUService extends InitService {

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
        @InjectRepository(Language) protected langRepository: Repository<Language>,
        @InjectRepository(Role) protected roleRepository: Repository<Role>) {
        super(dataSource, publicationRepository, authorRepository, autPubRepository, publicationTypeRepository, costTypeRepository, funderRepository,
            instituteRepository, costCenterRepository, oaCategoryRepository, greaterEntityRepository, publisherRepository, publisherDOIRepository, contractRepository,
            configRepository, aliasInstRep, aliasPublRep, aliasPubType, aliasFunder, langRepository, roleRepository)
    }

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
            { label: 'Deutsch' },
            { label: 'Englisch' },
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
        let pt = { label: 'Journal article', review: true };
        pt = await this.publicationTypeRepository.save(pt);
        let alias = ["journal-article", "article"];
        await this.aliasPubType.save(alias.map(a => { return { element: pt, alias: a } }))

        pt = { label: 'Conference proceedings', review: true };
        pt = await this.publicationTypeRepository.save(pt);
        alias = ["proceeding"];
        await this.aliasPubType.save(alias.map(a => { return { element: pt, alias: a } }))

        pt = { label: 'Chapter', review: true };
        pt = await this.publicationTypeRepository.save(pt);
        alias = ["book-chapter"];
        await this.aliasPubType.save(alias.map(a => { return { element: pt, alias: a } }))

        pt = { label: 'Book', review: false };
        pt = await this.publicationTypeRepository.save(pt);
        alias = ["book", "monograph"];
        await this.aliasPubType.save(alias.map(a => { return { element: pt, alias: a } }))

        let article: PublicationType[] = [
            { label: 'Article (non-reviewed)', review: false },
            { label: 'Dataset', review: false },
            { label: 'Preprint', review: false },
            { label: 'Software', review: false },
            { label: 'PhD thesis', review: true },
            { label: 'Postdoctoral thesis', review: true },
            { label: 'Misc.', review: false },
            { label: 'Unknown', review: null },
            { label: 'Editorship', review: false }
        ]
        await this.publicationTypeRepository.save(article);
    }

    async addPubl() {
        let publ: Publisher = {
            label: 'Springer Nature'
        }
        publ = await this.publisherRepository.save(publ);
        let alias = ["springer", "nature", "biomed central", "embo", "science china press", "verl. für sozialwissenschaften", "vieweg", "vs verlag für sozialwissenschaften"];
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        let doi_prefixes = ['10.1007', '10.1023', '10.1065', '10.1114', '10.1186', '10.1245', '10.1251', '10.1361', '10.1365', '10.1379', '10.1381', '10.1385', '10.1617', '10.1891', '10.3758', '10.4076', '10.4098', '10.4333', '10.5052', '10.5819', '10.7603'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'Wiley'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["wiley", "american geophysical union"];
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.1002'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'MDPI'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["mdpi", "molecular diversity preservation international"];
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))

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
        publ = {
            label: 'Taylor & Francis',
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["taylor", "routledge", "cass", "informa uk limited"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.1080'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'Thieme'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["thieme"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
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
        publ = {
            label: 'Hogrefe'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["hogrefe"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        publ = {
            label: 'Hogrefe'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["hogrefe"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
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
        doi_prefixes = ['10.1093'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'SCITEPRESS'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["scitepress"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
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
        publ = {
            label: 'OVGU'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["guericke", "universitätsbibliothek magdeburg"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        publ = {
            label: 'Elsevier'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["elsevier", "academic press", "cell press", "churchill livingstone", "lancet publ", "science direct"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        doi_prefixes = ['10.1016'];
        await this.publisherDOIRepository.save(doi_prefixes.map(a => { return { publisher: publ, doi_prefix: a } }))

        publ = {
            label: 'BMJ Publishing Group'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["bmj p", "bmj journal"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        publ = {
            label: 'Brill'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["böhlau", "vandenhoeck", "brill"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        publ = {
            label: 'Wolters Kluwer'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["carl link", "wolters kluwer"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        publ = {
            label: 'Deutsche Gesellschaft für Akustik e.V.'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["deutsche gesellschaft für akustik"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        publ = {
            label: 'North-Holland'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["north-holland"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        publ = {
            label: 'Cambridge University Press'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["cambridge univ", "cup"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
        publ = {
            label: 'Klett-Cotta'
        }
        publ = await this.publisherRepository.save(publ);
        alias = ["klett-cotta", "schattauer"]
        await this.aliasPublRep.save(alias.map(a => { return { element: publ, alias: a } }))
    }

    async addInst() {
        let ovgu: Institute = {
            label: 'Otto-von-Guericke-Universität Magdeburg',
            short_label: 'OVGU'
        }
        ovgu = await this.instituteRepository.save(ovgu);

        let ovguOhneFME: Institute = {
            label: 'OVGU ohne FME',
            short_label: 'OVGU ohne FME',
            super_institute: ovgu
        }
        ovguOhneFME = await this.instituteRepository.save(ovguOhneFME);

        let fak: Institute = {
            label: 'Zentrale Einrichtungen',
            short_label: 'ZE',
            super_institute: ovguOhneFME
        }
        fak = await this.instituteRepository.save(fak);
        let alias = ["universitätsbibliothek", "universitätsrechenzentrum"];
        await this.aliasInstRep.save(alias.map(a => { return { element: fak, alias: a } }))

        fak = {
            label: 'Fakultät für Humanwissenschaft',
            short_label: 'FHW',
            super_institute: ovguOhneFME
        }
        fak = await this.instituteRepository.save(fak);
        alias = ["fakultät für humanwissenschaft", "institut i", "sport", "humanities", "philosoph", "human science", "social science", "political science", "fhw"];
        await this.aliasInstRep.save(alias.map(a => { return { element: fak, alias: a } }))

        fak = {
            label: 'Fakultät für Medizin',
            short_label: 'FME',
            super_institute: ovgu
        }
        fak = await this.instituteRepository.save(fak);
        alias = ["medizinische fakultät", "klinik", "medicine", "surgery", "hospital", "clinic", "cardiology", "urology", "ambulanz", "medizin", "medical",
            "psychiatry", "diabetes", "pediatrics", "hematology", "patholog", "pharma", "dermatolog", "gastroenterolog", "radiation", "brain science", "orthop",
            "audiol", "radiolog", "geneti", "pneumonolog", "fme", "arbeitsmedizin", "image guided therapy", "fehlbildungsmonitor", "chirurgie", "toxikolog",
            "notaufnahme", "entzündungsforschung"];
        await this.aliasInstRep.save(alias.map(a => { return { element: fak, alias: a } }))

        fak = {
            label: 'Fakultät für Informatik',
            short_label: 'FIN',
            super_institute: ovguOhneFME
        }
        fak = await this.instituteRepository.save(fak);
        alias = ["vlba", "mrcc", "computer science", "information technology and communications", "informatik", "informatics", "business information system",
            "intelligent interacting systems", "artificial intelligence lab", "intelligent cooperating systems", "computational intelligence", "fin",
            "intelligente kooperierende", "simulation und graphik", "simulation and graphic", "betriebliche informationssystem", "university competence center"];
        await this.aliasInstRep.save(alias.map(a => { return { element: fak, alias: a } }))

        fak = {
            label: 'Fakultät für Naturwissenschaften',
            short_label: 'FNW',
            super_institute: ovguOhneFME
        }
        fak = await this.instituteRepository.save(fak);
        alias = ["physics", "naturwissenschaften", "physik", "chemisch", "biology", "chemi", "psycholog", "neuroplasti", "fnw"];
        await this.aliasInstRep.save(alias.map(a => { return { element: fak, alias: a } }))

        fak = {
            label: 'Fakultät für Maschinenbau',
            short_label: 'FMB',
            super_institute: ovguOhneFME
        }
        fak = await this.instituteRepository.save(fak);
        alias = ["logistics", "maschinenbau", "mechanical engineering", "mechanics", "material", "mechanik", "manufacturing sys",
            "mobile system", "machine elements", "fmb", "arbeitswissenschaft", "fertigungstechnik", "materialfluss", "maschinenkonstruktion",
            "fügetechnik"];
        await this.aliasInstRep.save(alias.map(a => { return { element: fak, alias: a } }))

        fak = {
            label: 'Fakultät für Mathematik',
            short_label: 'FMA',
            super_institute: ovguOhneFME
        }
        fak = await this.instituteRepository.save(fak);
        alias = ["mathemat", "analysis", "algebra", "fma", "mathematische optimierung", "stochastik"];
        await this.aliasInstRep.save(alias.map(a => { return { element: fak, alias: a } }))

        fak = {
            label: 'Fakultät für Wirtschaftswissenschaft',
            short_label: 'FWW',
            super_institute: ovguOhneFME
        }
        fak = await this.instituteRepository.save(fak);
        alias = ["economics", "wirtschaftswissenschaft", "marketing", "fww", "bwl", "vwl", "forschergruppe iwh", "ökonomie"];
        await this.aliasInstRep.save(alias.map(a => { return { element: fak, alias: a } }))

        fak = {
            label: 'Fakultät für Elektrotechnik und Informationstechnik',
            short_label: 'FEIT',
            super_institute: ovguOhneFME
        }
        fak = await this.instituteRepository.save(fak);
        alias = ["elektrotechnik", "informationstechnik", "communication engineering", "electrical engineering", "neuro-information technology",
            "electric power systems", "automatic control", "electromagneti", "feit", "automatisierungstechnik", "elektrische energiesystem",
            "kommunikationstechnik", "sensorsysteme", "medizintechnik"];
        await this.aliasInstRep.save(alias.map(a => { return { element: fak, alias: a } }))

        fak = {
            label: 'Fakultät für Verfahrens- und Systemtechnik',
            short_label: 'FVST',
            super_institute: ovguOhneFME
        }
        fak = await this.instituteRepository.save(fak);
        alias = ["verfahrens", "systemtechnik", "process engineering", "process systems engineering", "strömungstechnik", "fluid dynamics",
            "environmental engineering", "process- and systems engineering", "fvst", "umwelttechnik"];
        await this.aliasInstRep.save(alias.map(a => { return { element: fak, alias: a } }))
    }
}
