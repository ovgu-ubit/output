import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { FilterOptions, GROUP, HighlightOptions, STATISTIC, TIMEFRAME } from "../../../output-interfaces/Statistics";
import { Publication } from '../entity/Publication';
import { ContractService } from './entities/contract.service';
import { OACategoryService } from './entities/oa-category.service';

@Injectable()
export class StatisticsService {

    autPubSubQuery: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any> = sq => {
        return sq
            .select("p.id", "p_id")
            .addSelect("array_agg(aut_pub.corresponding)", "corresponding")
            .addSelect("array_agg(institute.label)", "institute")
            .addSelect("array_agg(institute.id)", "institute_id")
            .from("publication", "p")
            .leftJoin('p.authorPublications', 'aut_pub')
            .leftJoin('aut_pub.institute', 'institute')
            .groupBy("p.id")
    }

    constructor(@InjectRepository(Publication) private pubRepository: Repository<Publication>, private configService: ConfigService,
        private oaService: OACategoryService, private contractService: ContractService) { }

    async publication_statistic(reporting_year, statistic: STATISTIC, by_entity: GROUP[], timeframe: TIMEFRAME, filterOptions?: FilterOptions, highlightOptions?: HighlightOptions) {
        let query = this.pubRepository.createQueryBuilder('publication')
        let autPubAlready = false;

        if (timeframe === TIMEFRAME.CURRENT_YEAR) {
            query = this.addReportingYears(query, [reporting_year]);
        } else if (timeframe === TIMEFRAME.THREE_YEAR_REPORT) {
            query = this.addReportingYears(query, [reporting_year, reporting_year - 1, reporting_year - 2]);
        } else if (timeframe === TIMEFRAME.ALL_YEARS) {
            query = this.addReportingYears(query, null);
        } else throw "no valid timeframe given"

        if (by_entity.includes(GROUP.PUB_TYPE)) {
            query = query
                .leftJoin('publication.pub_type', 'pub_type')
                .addSelect("case when pub_type.label is not null then pub_type.label else 'Unbekannt' end", 'pub_type')
                .addSelect('pub_type.id', 'pub_type_id')
                .addGroupBy('pub_type')
                .addGroupBy('pub_type.id')
                .addOrderBy('pub_type.id')
        }

        if (by_entity.includes(GROUP.PUBLISHER)) {
            query = query
                .leftJoin('publication.publisher', 'publisher')
                .addSelect("case when publisher.label is not null then publisher.label else 'Unbekannt' end", 'publisher')
                .addSelect('publisher.id', 'publisher_id')
                .addGroupBy('publisher')
                .addGroupBy('publisher.id')
                .addOrderBy('publisher.id')
        }

        if (by_entity.includes(GROUP.CONTRACT)) {
            query = query
                .leftJoin('publication.contract', 'contract')
                .addSelect("case when contract.label is not null then contract.label else 'Unbekannt' end", 'contract')
                .addSelect('contract.id', 'contract_id')
                .addGroupBy('contract')
                .addGroupBy('contract.id')
                .addOrderBy('contract.id')
        }

        if (by_entity.includes(GROUP.OA_CATEGORY)) {
            query = query
                .leftJoin('publication.oa_category', 'oa_category')
                .addSelect("case when oa_category.label is not null then oa_category.label else 'Unbekannt' end", 'oa_category')
                .addSelect('oa_category.id', 'oa_category_id')
                .addGroupBy('oa_category')
                .addGroupBy('oa_category.id')
                .addOrderBy('oa_category.id')
        }

        if (by_entity.includes(GROUP.LOCK)) {
            query = query
                .addSelect("publication.locked","locked")
                .addGroupBy('locked')
                .addOrderBy('locked')
        }

        if (by_entity.includes(GROUP.INSTITUTE_FIRST)) {
            autPubAlready = true;
            query = query
                .addSelect("CASE WHEN array_length(array_remove(tmp.institute, NULL),1) is null THEN NULL ELSE (array_remove(tmp.institute, NULL))[1] END", 'institute_first')
                .addSelect("CASE WHEN array_length(array_remove(tmp.institute_id, NULL),1) is null THEN NULL ELSE (array_remove(tmp.institute_id, NULL))[1] END", 'institute_first_id')
                .addGroupBy("institute_first")
                .addGroupBy("institute_first_id")
                .addOrderBy("institute_first")
                .addOrderBy("institute_first_id")
        }

        if (by_entity.includes(GROUP.INSTITUTE_CORRESPONDING)) {
            autPubAlready = true;
            query = query
                .addSelect("tmp.institute[array_position(tmp.corresponding, true)]", 'institute_corr')
                .addSelect("tmp.institute_id[array_position(tmp.corresponding, true)]", 'institute_corr_id')
                .addGroupBy("institute_corr")
                .addGroupBy("institute_corr_id")
                .addOrderBy("institute_corr")
                .addOrderBy("institute_corr_id")
        }

        if (by_entity.includes(GROUP.CORRESPONDING_ANY)) {
            autPubAlready = true;
            query = query
                .addSelect("array_position(tmp.corresponding, true) is not null", 'corresponding_any')
                .addGroupBy('corresponding_any')
                .addOrderBy('corresponding_any')
        }

        query = this.addStat(query, statistic === STATISTIC.NET_COSTS)
        query = this.addFilter(query, autPubAlready, filterOptions, highlightOptions)

        //console.log(query.getSql())

        return query.getRawMany();
    }

    addReportingYears(query: SelectQueryBuilder<Publication>, reporting_years: number[]) {
        let field = "(CASE WHEN pub_date is not null THEN extract('Year' from pub_date at time zone 'UTC') ELSE " +
            "(CASE WHEN pub_date_print is not null THEN extract('Year' from pub_date_print at time zone 'UTC') ELSE " +
            "(CASE WHEN pub_date_accepted is not null THEN extract('Year' from pub_date_accepted at time zone 'UTC') ELSE " +
            "(CASE WHEN pub_date_submitted is not null THEN extract('Year' from pub_date_submitted at time zone 'UTC') ELSE null END) END) END) END)"
        query = query.select(field + "::int", "pub_year")
        query = query.groupBy("pub_year")
        if (reporting_years && reporting_years.length > 0) {
            let clauses = "(";
            for (let reporting_year of reporting_years) {
                clauses += field + " =" + reporting_year + " or ";
            }
            query = query.where(clauses.substring(0, clauses.length - 4) + ")")
        }
        query = query.orderBy("pub_year")
        return query;
    }

    addStat(query: SelectQueryBuilder<Publication>, costs: boolean, corresponding?: boolean) {
        if (!costs) query = query.addSelect('count(distinct publication.id)::int as value')
        else query = query.leftJoin("publication.invoices", "invoice")
            .leftJoin("invoice.cost_items", "cost_item")
            .addSelect("sum(CASE WHEN cost_item.euro_value IS NULL THEN 0 ELSE cost_item.euro_value END) as value")
        if (corresponding) query = query.andWhere('aut_pub.corresponding')
        return query//.orderBy('value', 'DESC');
    }

    addFilter(query: SelectQueryBuilder<Publication>, autPubAlready: boolean, filterOptions: FilterOptions, highlightOptions?: HighlightOptions) {
        let autPub = autPubAlready;
        let innerJoin = false;

        if (filterOptions?.corresponding) {
            innerJoin = true;
            autPub = true;
            query = query.andWhere('array_position(corresponding, true) is not null')
        } else if (filterOptions?.corresponding === false) {
            innerJoin = true;
            autPub = true;
            query = query.andWhere('array_position(corresponding, true) is null')
        }
        if (filterOptions?.locked) {
            query = query.andWhere('publication.locked = :lock', { lock: true })
        } else if (filterOptions?.locked === false) {
            query = query.andWhere('publication.locked = :lock', { lock: false })
        }
        if (filterOptions?.instituteId !== undefined) {
            autPub = true;
            innerJoin = true;
            if (filterOptions.instituteId.findIndex(e => e === null) !== -1) {
                filterOptions.instituteId = filterOptions.instituteId.filter(e => e != null);
                query = query.andWhere('(array_length(array_remove(institute_id, NULL), 1) is null or array_length(institute_id, 1) > array_length(array_remove(institute_id, NULL), 1))')
            }
            if (filterOptions.instituteId.length > 0) query = query.andWhere('tmp.institute_id::integer[] @> ARRAY[:...instituteId]::integer[]', { instituteId: filterOptions.instituteId })
        }
        if (filterOptions?.notInstituteId !== undefined) {
            autPub = true;
            //innerJoin = true;
            if (filterOptions.notInstituteId.findIndex(e => e === null) !== -1) {
                filterOptions.notInstituteId = filterOptions.notInstituteId.filter(e => e != null);
                query = query.andWhere('array_length(institute_id, 1) = array_length(array_remove(institute_id, NULL), 1)')
            }
            if (filterOptions.notInstituteId.length > 0) query = query.andWhere('NOT (tmp.institute_id::integer[] && ARRAY[:...notInstituteId]::integer[])', { notInstituteId: filterOptions.notInstituteId })
        }
        let where = "";
        if (filterOptions?.publisherId !== undefined) {
            if (filterOptions.publisherId.findIndex(e => e === null) !== -1) {
                filterOptions.publisherId = filterOptions.publisherId.filter(e => e != null);
                where='(publication.\"publisherId\" IS NULL';
            }
            if (filterOptions.publisherId.length > 0) {
                if (where) where+=" OR publication.\"publisherId\" IN (:...publisherId))"
                else where = "publication.\"publisherId\" IN (:...publisherId)"
            } else where = where.substring(1,where.length)
            query = query.andWhere(where, { publisherId: filterOptions.publisherId })
        }
        if (filterOptions?.notPublisherId !== undefined) {
            if (filterOptions.notPublisherId.findIndex(e => e === null) !== -1) {
                filterOptions.notPublisherId = filterOptions.notPublisherId.filter(e => e != null);
                query = query.andWhere('publication.\"publisherId\" IS NOT NULL')
            }
            if (filterOptions.notPublisherId.length > 0) query = query.andWhere('(publication.\"publisherId\" NOT IN (:...notPublisherId) OR publication.\"publisherId\" IS NULL)', { notPublisherId: filterOptions.notPublisherId })
        }
        where = "";
        if (filterOptions?.contractId !== undefined) {
            if (filterOptions.contractId.findIndex(e => e === null) !== -1) {
                filterOptions.contractId = filterOptions.contractId.filter(e => e != null);
                where = '(publication.\"contractId\" IS NULL'
            }
            if (filterOptions.contractId.length > 0) {
                if (where) where+=" OR publication.\"contractId\" IN (:...contractId))"
                else where="publication.\"contractId\" IN (:...contractId)"
            } else where = where.substring(1,where.length)
            query = query.andWhere(where, { contractId: filterOptions.contractId })
        }
        if (filterOptions?.notContractId !== undefined) {
            if (filterOptions.notContractId.findIndex(e => e === null) !== -1) {
                filterOptions.notContractId = filterOptions.notContractId.filter(e => e != null);
                query = query.andWhere('publication.\"contractId\" IS NOT NULL')
            }
            if (filterOptions.notContractId.length > 0) query = query.andWhere('(publication.\"contractId\" NOT IN (:...notContractId) OR publication.\"contractId\" IS NULL)', { notContractId: filterOptions.notContractId })
        }
        where = "";
        if (filterOptions?.pubTypeId !== undefined) {
            if (filterOptions.pubTypeId.findIndex(e => e === null) !== -1) {
                filterOptions.pubTypeId = filterOptions.pubTypeId.filter(e => e != null);
                where = '(publication.\"pubTypeId\" IS NULL'
            }
            if (filterOptions.pubTypeId.length > 0) {
                if (where) where+=" OR publication.\"pubTypeId\" IN (:...pubTypeId))"
                else where="publication.\"pubTypeId\" IN (:...pubTypeId)"
            } else where = where.substring(1,where.length)
            query = query.andWhere(where, { pubTypeId: filterOptions.pubTypeId })
        }
        if (filterOptions?.notPubTypeId !== undefined) {
            if (filterOptions.notPubTypeId.findIndex(e => e === null) !== -1) {
                filterOptions.notPubTypeId = filterOptions.notPubTypeId.filter(e => e != null);
                query = query.andWhere('publication.\"pubTypeId\" IS NOT NULL')
            }
            if (filterOptions.notPubTypeId.length > 0) query = query.andWhere('(publication.\"pubTypeId\" NOT IN (:...notPubTypeId) OR publication.\"pubTypeId\" IS NULL)', { notPubTypeId: filterOptions.notPubTypeId })
        }
        where = "";
        if (filterOptions?.oaCatId !== undefined) {
            if (filterOptions.oaCatId.findIndex(e => e === null) !== -1) {
                filterOptions.oaCatId = filterOptions.oaCatId.filter(e => e != null);
                where = '(publication.\"oaCategoryId\" IS NULL'
            }
            if (filterOptions.oaCatId.length > 0) {
                if (where) where+=" OR publication.\"oaCategoryId\" IN (:...oaCatId))"
                else where="publication.\"oaCategoryId\" IN (:...oaCatId)"
            } else where = where.substring(1,where.length)
            query = query.andWhere(where, { oaCatId: filterOptions.oaCatId })
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

        //if (autPub && !autPubAlready) query = query.leftJoin('publication.authorPublications', 'aut_pub')

        if (autPub) {
            if (!innerJoin) query = query
                .leftJoin(this.autPubSubQuery, 'tmp', 'tmp.p_id = publication.id')
            else query = query
                .innerJoin(this.autPubSubQuery, 'tmp', 'tmp.p_id = publication.id')
        }

        return query;
    }

    async oaReport(reporting_year, filterOptions?: FilterOptions) {
        /*let journalPubType = await this.pubTypeService.findOrSave("article")
        let oaGold = await firstValueFrom(this.oaService.findOrSave("gold"))
        let oaHybrid = await firstValueFrom(this.oaService.findOrSave("hybrid"))

        let obj = (await this.corresponding(reporting_year, { locked: true, ...filterOptions }))[0];
        let count_pub = obj?.value;
        let count_pub_corr = obj?.corresponding;

        obj = (await this.goldOACost(reporting_year, { locked: true, ...filterOptions }));
        let gold_oa_net_cost = obj[0]?.value

        let pub_type_corr = (await this.pub_type(reporting_year, false, { locked: true, corresponding: true, ...filterOptions }))
        let pub_type_all = (await this.pub_type(reporting_year, false, { locked: true, ...filterOptions }))


        let oa_dev = await this.oa_development(reporting_year, { locked: true, corresponding: true, pubTypeId: [journalPubType.id], ...filterOptions })
        let oa_category_development = [];
        let idx = 0;
        while (idx < oa_dev.length) {
            obj = { oa_category: oa_dev[idx].oa_category }
            do {
                let line = oa_dev[idx];
                obj[line.year] = line.value
            } while (++idx < oa_dev.length && obj.oa_category == oa_dev[idx].oa_category)
            oa_category_development.push(obj)
        }

        let inst_dev = await this.inst_development(reporting_year, { locked: true, corresponding: true, pubTypeId: [journalPubType.id], ...filterOptions })
        let institute_development = [];
        idx = 0;
        while (idx < inst_dev.length) {
            obj = { institute: inst_dev[idx].institute }
            do {
                let line = inst_dev[idx];
                obj[line.year] = line.value
            } while (++idx < inst_dev.length && obj.institute == inst_dev[idx].institute)
            institute_development.push(obj)
        }

        let publ_dev = await this.publ_development(reporting_year, { locked: true, corresponding: true, pubTypeId: [journalPubType.id], oaCatId: [oaGold.id, oaHybrid.id], ...filterOptions })
        let publisher_top5_development = [];
        idx = 0;
        while (idx < publ_dev.length) {
            obj = { publisher: publ_dev[idx].publisher }
            do {
                let line = publ_dev[idx];
                obj[line.year] = line.value
            } while (++idx < publ_dev.length && obj.publisher == publ_dev[idx].publisher)
            publisher_top5_development.push(obj)
        }

        return {
            count_pub,
            count_pub_corr,
            gold_oa_net_cost,
            contract_costs: await this.contractCosts(reporting_year, { locked: true, ...filterOptions }),
            publication_types: pub_type_all.map((e, i) => {
                let corr = Number(pub_type_corr.find(v => v.id === e.id)?.value)
                if (Number.isNaN(corr)) corr = 0;
                return {
                    label: e.pub_type,
                    corresponding: corr,
                    all: Number(e.value)
                };
            }),
            oa_category_development,
            institute_development,
            publisher_top5_development
        }*/
    }
}

