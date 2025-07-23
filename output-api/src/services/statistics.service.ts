import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { FilterOptions, HighlightOptions } from "../../../output-interfaces/Statistics";
import { Publication } from '../entity/Publication';
import { InstitutionService } from './entities/institution.service';
import { OACategoryService } from './entities/oa-category.service';
import { firstValueFrom } from 'rxjs';
import { ContractService } from './entities/contract.service';

@Injectable()
export class StatisticsService {

    constructor(@InjectRepository(Publication) private pubRepository: Repository<Publication>, private configService: ConfigService,
        private instService: InstitutionService, private oaService: OACategoryService, private contractService: ContractService) { }

    async countPubsByYear(filterOptions?: FilterOptions, highlightOptions?: HighlightOptions) {
        let instIDs = [];
        if (filterOptions?.instituteId) {
            instIDs = [filterOptions.instituteId];
            instIDs = instIDs.concat((await this.instService.findSubInstitutesFlat(filterOptions?.instituteId)).map(e => e.id))
        }

        let query = this.pubRepository.createQueryBuilder('publication')
            .select("CASE WHEN publication.pub_date IS NOT NULL THEN extract('Year' from publication.pub_date at time zone 'UTC') " +
                "WHEN publication.pub_date_print IS NOT NULL THEN extract('Year' from publication.pub_date_print at time zone 'UTC') " +
                "WHEN publication.pub_date_accepted IS NOT NULL THEN extract('Year' from publication.pub_date_accepted at time zone 'UTC') " +
                "WHEN publication.pub_date_submitted IS NOT NULL THEN extract('Year' from publication.pub_date_submitted at time zone 'UTC') " +
                "ELSE NULL END"
                , 'pub_year')
            .addSelect("count(distinct publication.id)")
            .groupBy('pub_year')
            .orderBy('pub_year')
            .where('publication.id > 0')


        query = this.addFilter(query, false, filterOptions, highlightOptions)

        return query.getRawMany();
    }

    async locked(reporting_year, filterOptions?: FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let query = this.pubRepository.createQueryBuilder('publication')
            .select('count(distinct publication.id)', 'value')
            .addSelect('COUNT(distinct (CASE WHEN publication.locked THEN publication.id ELSE NULL END))', 'locked')

        query = this.addFilter(query, false, filterOptions)
        query = this.addReportingYear(query, reporting_year);

        return query.getRawMany();
    }

    async corresponding(reporting_year, filterOptions?: FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin('publication.authorPublications', 'aut_pub')
            .select('count(distinct publication.id)', 'value')
            .addSelect('COUNT(distinct (CASE WHEN aut_pub.corresponding THEN publication.id ELSE NULL END))', 'corresponding')

        query = this.addFilter(query, true, filterOptions)
        query = this.addReportingYear(query, reporting_year);

        return query.getRawMany();
    }

    async institute(reporting_year, costs: boolean, filterOptions?: FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin('publication.authorPublications', 'aut_pub')
            .leftJoin('aut_pub.institute', 'institute')
            .select("case when institute.label is not null then institute.label else 'Unbekannt' end", 'institute')
            .addSelect('institute.id', 'id')
            .groupBy('institute')
            .addGroupBy('institute.id')

        query = this.addStat(query, costs, costs)
        query = this.addFilter(query, true, filterOptions)
        query = this.addReportingYear(query, reporting_year);

        return query.getRawMany();
    }

    async oaCategory(reporting_year, costs: boolean, filterOptions?: FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin("publication.oa_category", 'oa_cat')
            .select("case when oa_cat.label is not null then oa_cat.label else 'Unbekannt' end", 'oa_cat')
            .addSelect('oa_cat.id', 'id')
            .groupBy('oa_cat')
            .addGroupBy('oa_cat.id')

        query = this.addStat(query, costs)
        query = this.addFilter(query, false, filterOptions)
        query = this.addReportingYear(query, reporting_year);

        return query.getRawMany();
    }

    async publisher(reporting_year, costs: boolean, filterOptions?: FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin('publication.publisher', 'publisher')
            .select("case when publisher.label is not null then publisher.label else 'Unbekannt' end", 'publisher')
            .addSelect('publisher.id', 'id')
            .groupBy('publisher')
            .addGroupBy('publisher.id')

        query = this.addStat(query, costs)
        query = this.addFilter(query, false, filterOptions)
        query = this.addReportingYear(query, reporting_year);

        return query.getRawMany();
    }

    async pub_type(reporting_year, costs: boolean, filterOptions?: FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin('publication.pub_type', 'pub_type')
            .select("case when pub_type.label is not null then pub_type.label else 'Unbekannt' end", 'pub_type')
            .addSelect('pub_type.id', 'id')
            .groupBy('pub_type')
            .addGroupBy('pub_type.id')

        query = this.addStat(query, costs)
        query = this.addFilter(query, false, filterOptions)
        query = this.addReportingYear(query, reporting_year);

        return query.getRawMany();
    }

    async contract(reporting_year, costs: boolean, filterOptions?: FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin('publication.contract', 'contract')
            .select("case when contract.label is not null then contract.label else 'Unbekannt' end", 'contract')
            .addSelect('contract.id', 'id')
            .groupBy('contract')
            .addGroupBy('contract.id')

        query = this.addStat(query, costs)
        query = this.addFilter(query, false, filterOptions)
        query = this.addReportingYear(query, reporting_year);

        return query.getRawMany();
    }

    async goldOACost(reporting_year, filterOptions?: FilterOptions) {
        let oa_gold = await firstValueFrom(this.oaService.findOrSave("gold"))

        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let query = this.pubRepository.createQueryBuilder('publication')
            .where("publication.oa_category = " + oa_gold.id)
            .select("'all' as stat")

        query = this.addStat(query, true)
        query = this.addFilter(query, false, filterOptions)
        query = this.addReportingYear(query, reporting_year);

        //console.log(query.getSql())

        return query.getRawMany();
    }

    async contractCosts(reporting_year, filterOptions?: FilterOptions) {
        let contracts = await this.contractService.get()
        let sum = 0;
        for (let contract of contracts) {
            if (contract.end_date?.getFullYear() >= reporting_year && contract.start_date?.getFullYear() <= reporting_year) sum += contract.invoice_amount;
        }
        return sum;
    }

    addReportingYear(query: SelectQueryBuilder<Publication>, reporting_year: number) {
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        query = query
            .andWhere(new Brackets(qb => {
                qb.where(new Brackets(qb => {
                    qb.where('publication.pub_date >= :beginDate', { beginDate })
                        .andWhere('publication.pub_date <= :endDate', { endDate })
                }))
                    .orWhere(new Brackets(qb => {
                        qb.where('publication.pub_date is null')
                            .andWhere('publication.pub_date_print >= :beginDate and publication.pub_date_print <= :endDate', { beginDate, endDate })
                    }))
                    .orWhere(new Brackets(qb => {
                        qb.where('publication.pub_date is null and publication.pub_date_print is null')
                            .andWhere('publication.pub_date_accepted >= :beginDate and publication.pub_date_accepted <= :endDate', { beginDate, endDate })
                    }))
                    .orWhere(new Brackets(qb => {
                        qb.where('publication.pub_date is null and publication.pub_date_print is null and publication.pub_date_accepted is null')
                            .andWhere('publication.pub_date_submitted >= :beginDate and publication.pub_date_submitted <= :endDate', { beginDate, endDate })
                    }))
            }))
        return query;
    }

    addStat(query: SelectQueryBuilder<Publication>, costs: boolean, corresponding?: boolean) {
        if (!costs) query = query.addSelect('count(distinct publication.id) as value')
        else query = query.leftJoin("publication.invoices", "invoice")
            .leftJoin("invoice.cost_items", "cost_item")
            .addSelect("sum(CASE WHEN cost_item.euro_value IS NULL THEN 0 ELSE cost_item.euro_value END) as value")
        if (corresponding) query = query.andWhere('aut_pub.corresponding')
        return query.orderBy('value', 'DESC');
    }

    addFilter(query: SelectQueryBuilder<Publication>, autPubAlready: boolean, filterOptions: FilterOptions, highlightOptions?: HighlightOptions) {
        let autPub = false;
        if (filterOptions?.corresponding) {
            autPub = true;
            query = query.andWhere('aut_pub.corresponding = :corr', { corr: true })
        } else if (filterOptions?.corresponding === false) {
            autPub = true;
            query = query.andWhere('aut_pub.corresponding = :corr OR aut_pub.corresponding is NULL', { corr: false })
        }
        if (filterOptions?.locked) {
            autPub = true;
            query = query.andWhere('publication.locked = :lock', { lock: true })
        } else if (filterOptions?.locked === false) {
            autPub = true;
            query = query.andWhere('publication.locked = :lock', { lock: false })
        }
        if (filterOptions?.instituteId !== undefined) {
            autPub = true;
            if (filterOptions.instituteId) query = query.andWhere('aut_pub.\"instituteId\" = :instituteId', { instituteId: filterOptions.instituteId })
            else query = query.andWhere('aut_pub.\"instituteId\" IS NULL')
        }
        if (filterOptions?.notInstituteId !== undefined) {
            autPub = true;
            if (filterOptions.notInstituteId.findIndex(e => e === null) !== -1) {
                filterOptions.notInstituteId = filterOptions.notInstituteId.filter(e => e != null);
                query = query.andWhere('aut_pub.\"instituteId\" IS NOT NULL')
            }
            if (filterOptions.notInstituteId.length > 0) query = query.andWhere('(aut_pub.\"instituteId\" NOT IN (:...notInstituteId) OR aut_pub.\"instituteId\" IS NULL)', { notInstituteId: filterOptions.notInstituteId })
        }
        if (filterOptions?.publisherId !== undefined) {
            if (filterOptions?.publisherId) query = query.andWhere('publication.\"publisherId\" = :publisherId', { publisherId: filterOptions.publisherId })
            else query = query.andWhere('publication.\"publisherId\" IS NULL')
        }
        if (filterOptions?.notPublisherId !== undefined) {
            if (filterOptions.notPublisherId.findIndex(e => e === null) !== -1) {
                filterOptions.notPublisherId = filterOptions.notPublisherId.filter(e => e != null);
                query = query.andWhere('publication.\"publisherId\" IS NOT NULL')
            }
            if (filterOptions.notPublisherId.length > 0) query = query.andWhere('(publication.\"publisherId\" NOT IN (:...notPublisherId) OR publication.\"publisherId\" IS NULL)', { notPublisherId: filterOptions.notPublisherId })
        }
        if (filterOptions?.contractId !== undefined) {
            if (filterOptions?.contractId) query = query.andWhere('publication.\"contractId\" = :contractId', { contractId: filterOptions.contractId })
            else query = query.andWhere('publication.\"contractId\" IS NULL')
        }
        if (filterOptions?.notContractId !== undefined) {
            if (filterOptions.notContractId.findIndex(e => e === null) !== -1) {
                filterOptions.notContractId = filterOptions.notContractId.filter(e => e != null);
                query = query.andWhere('publication.\"contractId\" IS NOT NULL')
            }
            if (filterOptions.notContractId.length > 0) query = query.andWhere('(publication.\"contractId\" NOT IN (:...notContractId) OR publication.\"contractId\" IS NULL)', { notContractId: filterOptions.notContractId })
        }
        if (filterOptions?.pubTypeId !== undefined) {
            if (filterOptions?.pubTypeId) query = query.andWhere('publication.\"pubTypeId\" = :pubTypeId', { pubTypeId: filterOptions.pubTypeId })
            else query = query.andWhere('publication.\"pubTypeId\" IS NULL')
        }
        if (filterOptions?.notPubTypeId !== undefined) {
            if (filterOptions.notPubTypeId.findIndex(e => e === null) !== -1) {
                filterOptions.notPubTypeId = filterOptions.notPubTypeId.filter(e => e != null);
                query = query.andWhere('publication.\"pubTypeId\" IS NOT NULL')
            }
            if (filterOptions.notPubTypeId.length > 0) query = query.andWhere('(publication.\"pubTypeId\" NOT IN (:...notPubTypeId) OR publication.\"pubTypeId\" IS NULL)', { notPubTypeId: filterOptions.notPubTypeId })
        }
        if (filterOptions?.oaCatId !== undefined) {
            if (filterOptions?.oaCatId) query = query.andWhere('publication.\"oaCategoryId\" = :oaCatId', { oaCatId: filterOptions.oaCatId })
            else query = query.andWhere('publication.\"oaCategoryId\" IS NULL')
        }
        if (filterOptions?.notOaCatId !== undefined) {
            if (filterOptions.notOaCatId.findIndex(e => e === null) !== -1) {
                filterOptions.notOaCatId = filterOptions.notOaCatId.filter(e => e != null);
                query = query.andWhere('publication.\"oaCategoryId\" IS NOT NULL')
            }
            if (filterOptions.notOaCatId.length > 0) query = query.andWhere('(publication.\"oaCategoryId\" NOT IN (:...notOaCatId) OR publication.\"oaCategoryId\" IS NULL)', { notOaCatId: filterOptions.notOaCatId })
        }

        let highlight = '';
        if (highlightOptions?.corresponding) {
            autPub = true;
            highlight += 'aut_pub.corresponding AND '
        }
        if (highlightOptions?.locked) {
            autPub = true;
            highlight += 'publication.locked AND '
        }
        if (highlightOptions?.instituteId !== undefined) {
            autPub = true;
            if (highlightOptions?.instituteId) highlight += 'aut_pub.\"instituteId\" = ' + highlightOptions.instituteId + ' AND '
            else highlight += 'aut_pub.\"instituteId\" IS NULL AND '
        }
        if (highlightOptions?.publisherId !== undefined) {
            if (highlightOptions?.publisherId) highlight += 'publication.\"publisherId\" = ' + highlightOptions?.publisherId + ' AND '
            else highlight += 'publication.\"publisherId\" IS NULL AND '
        }
        if (highlightOptions?.contractId !== undefined) {
            if (highlightOptions?.contractId) highlight += 'publication.\"contractId\" = ' + highlightOptions?.contractId + ' AND '
            else highlight += 'publication.\"contractId\" IS NULL AND '
        }
        if (highlightOptions?.pubTypeId !== undefined) {
            if (highlightOptions?.pubTypeId) highlight += 'publication.\"pubTypeId\" = ' + highlightOptions?.pubTypeId + ' AND '
            else highlight += 'publication.\"pubTypeId\" IS NULL AND '
        }
        if (highlightOptions?.oaCatId !== undefined) {
            if (highlightOptions?.oaCatId) highlight += 'publication.\"oaCategoryId\" = ' + highlightOptions?.oaCatId + ' AND '
            else highlight += 'publication.\"oaCategoryId\" IS NULL AND '
        }

        if (highlight) query = query.addSelect('count(distinct CASE WHEN ' + highlight.slice(0, highlight.length - 5) + ' THEN publication.id ELSE NULL END)', 'highlight')

        if (autPub && !autPubAlready) query = query.leftJoin('publication.authorPublications', 'aut_pub')

        //console.log(query.getSql())

        return query;
    }

    async oaReport(reporting_year, filterOptions?: FilterOptions) {
        let obj = (await this.corresponding(reporting_year, filterOptions))[0];
        let count_pub = obj?.value;
        let count_pub_corr = obj?.corresponding;

        obj = (await this.goldOACost(reporting_year, filterOptions));
        let gold_oa_net_cost = obj[0]?.value

        let pub_type_corr = (await this.pub_type(reporting_year, false, { corresponding: true }))
        let pub_type_all = (await this.pub_type(reporting_year, false))

        return {
            count_pub,
            count_pub_corr,
            gold_oa_net_cost,
            contract_costs: await this.contractCosts(reporting_year),
            publication_types: pub_type_all.map((e, i) => {
                let corr = Number(pub_type_corr.find(v => v.id === e.id)?.value)
                if (Number.isNaN(corr)) corr = 0;
                return {
                    label: e.pub_type,
                    corresponding: corr,
                    all: Number(e.value)
                };
            })
        }
    }
}

