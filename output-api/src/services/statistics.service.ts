
import { Observable, timer } from 'rxjs';
import { take, timeout } from 'rxjs/operators'
import { Injectable } from '@nestjs/common';
import { Publication } from '../entity/Publication';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOptionsWhere, ILike, In, Like, Repository, SelectQueryBuilder } from 'typeorm';
import { FilterOptions, HighlightOptions } from "../../../output-interfaces/Statistics"
import { ConfigService } from '@nestjs/config';
import { InstitutionService } from './entities/institution.service';
@Injectable()
export class StatisticsService {

    constructor(@InjectRepository(Publication) private pubRepository: Repository<Publication>, private configService: ConfigService, private instService: InstitutionService) { }

    async countPubsByYear(filterOptions?: FilterOptions, highlightOptions?: HighlightOptions) {
        let instIDs = [];
        if (filterOptions?.instituteId) {
            instIDs = [filterOptions.instituteId];
            instIDs = instIDs.concat((await this.instService.findSubInstitutesFlat(filterOptions?.instituteId)).map(e => e.id))
        }

        let query = this.pubRepository.createQueryBuilder('publication')
            .select("extract('Year' from publication.pub_date at time zone 'UTC')", 'pub_year')
            .addSelect("count(distinct publication.id)")
            .groupBy('pub_year')
            .orderBy('pub_year')
            .where('publication.id > 0')


        query = this.addFilter(query, false, filterOptions, highlightOptions)

        return query.getRawMany();
    }

    async locked(reporting_year, filterOptions?: FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.pubRepository.createQueryBuilder('publication')
            .select('count(distinct publication.id)', 'value')
            .addSelect('COUNT(distinct (CASE WHEN publication.locked THEN publication.id ELSE NULL END))', 'locked')
            .where('pub_date between :beginDate and :endDate', { beginDate, endDate })

        query = this.addFilter(query, false, filterOptions)

        return query.getRawMany();
    }

    async corresponding(reporting_year, filterOptions?: FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin('publication.authorPublications', 'aut_pub')
            .select('count(distinct publication.id)', 'value')
            .addSelect('COUNT(distinct (CASE WHEN aut_pub.corresponding THEN publication.id ELSE NULL END))', 'corresponding')
            .where('pub_date between :beginDate and :endDate', { beginDate, endDate })

        query = this.addFilter(query, true, filterOptions)

        return query.getRawMany();
    }

    async institute(reporting_year, costs: boolean, filterOptions?: FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin('publication.authorPublications', 'aut_pub')
            .leftJoin('aut_pub.institute', 'institute')
            .select("case when institute.label is not null then institute.label else 'Unbekannt' end", 'institute')
            .addSelect('institute.id', 'id')
            .where('pub_date between :beginDate and :endDate', { beginDate, endDate })
            .groupBy('institute')
            .addGroupBy('institute.id')

        query = this.addStat(query, costs, costs)
        query = this.addFilter(query, true, filterOptions)

        return query.getRawMany();
    }

    async oaCategory(reporting_year, costs: boolean, filterOptions?: FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin("publication.oa_category", 'oa_cat')
            .select("case when oa_cat.label is not null then oa_cat.label else 'Unbekannt' end", 'oa_cat')
            .addSelect('oa_cat.id', 'id')
            .where('pub_date between :beginDate and :endDate', { beginDate, endDate })
            .groupBy('oa_cat')
            .addGroupBy('oa_cat.id')

        query = this.addStat(query, costs)
        query = this.addFilter(query, false, filterOptions)

        return query.getRawMany();
    }

    async publisher(reporting_year, costs: boolean, filterOptions?: FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin('publication.publisher', 'publisher')
            .select("case when publisher.label is not null then publisher.label else 'Unbekannt' end", 'publisher')
            .addSelect('publisher.id', 'id')
            .where('pub_date between :beginDate and :endDate', { beginDate, endDate })
            .groupBy('publisher')
            .addGroupBy('publisher.id')

        query = this.addStat(query, costs)
        query = this.addFilter(query, false, filterOptions)

        return query.getRawMany();
    }

    async pub_type(reporting_year, costs: boolean, filterOptions?: FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin('publication.pub_type', 'pub_type')
            .select("case when pub_type.label is not null then pub_type.label else 'Unbekannt' end", 'pub_type')
            .addSelect('pub_type.id', 'id')
            .where('pub_date between :beginDate and :endDate', { beginDate, endDate })
            .groupBy('pub_type')
            .addGroupBy('pub_type.id')

        query = this.addStat(query, costs)
        query = this.addFilter(query, false, filterOptions)

        return query.getRawMany();
    }

    async contract(reporting_year, costs: boolean, filterOptions?: FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin('publication.contract', 'contract')
            .select("case when contract.label is not null then contract.label else 'Unbekannt' end", 'contract')
            .addSelect('contract.id', 'id')
            .where('pub_date between :beginDate and :endDate', { beginDate, endDate })
            .groupBy('contract')
            .addGroupBy('contract.id')

        query = this.addStat(query, costs)
        query = this.addFilter(query, false, filterOptions)

        return query.getRawMany();
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
            query = query.andWhere('aut_pub.corresponding = :corr', { corr: false })
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
            if (filterOptions.notInstituteId) query = query.andWhere('aut_pub.\"instituteId\" <> :notInstituteId', { notInstituteId: filterOptions.notInstituteId })
            else query = query.andWhere('aut_pub.\"instituteId\" IS NOT NULL')
        }
        if (filterOptions?.publisherId !== undefined) {
            if (filterOptions?.publisherId) query = query.andWhere('publication.\"publisherId\" = :publisherId', { publisherId: filterOptions.publisherId })
            else query = query.andWhere('publication.\"publisherId\" IS NULL')
        }
        if (filterOptions?.notPublisherId !== undefined) {
            if (filterOptions?.notPublisherId) query = query.andWhere('publication.\"publisherId\" <> :notPublisherId', { notPublisherId: filterOptions.notPublisherId })
            else query = query.andWhere('publication.\"publisherId\" IS NOT NULL')
        }
        if (filterOptions?.contractId !== undefined) {
            if (filterOptions?.contractId) query = query.andWhere('publication.\"contractId\" = :contractId', { contractId: filterOptions.contractId })
            else query = query.andWhere('publication.\"contractId\" IS NULL')
        }
        if (filterOptions?.notContractId !== undefined) {
            if (filterOptions?.notContractId) query = query.andWhere('publication.\"contractId\" <> :notContractId', { notContractId: filterOptions.notContractId })
            else query = query.andWhere('publication.\"contractId\" IS NOT NULL')
        }
        if (filterOptions?.pubTypeId !== undefined) {
            if (filterOptions?.pubTypeId) query = query.andWhere('publication.\"pubTypeId\" = :pubTypeId', { pubTypeId: filterOptions.pubTypeId })
            else query = query.andWhere('publication.\"pubTypeId\" IS NULL')
        }
        if (filterOptions?.notPubTypeId !== undefined) {
            if (filterOptions?.notPubTypeId) query = query.andWhere('publication.\"pubTypeId\" <> :notPubTypeId', { notPubTypeId: filterOptions.notPubTypeId })
            else query = query.andWhere('publication.\"pubTypeId\" IS NOT NULL')
        }
        if (filterOptions?.oaCatId !== undefined) {
            if (filterOptions?.oaCatId) query = query.andWhere('publication.\"oaCategoryId\" = :oaCatId', { oaCatId: filterOptions.oaCatId })
            else query = query.andWhere('publication.\"oaCategoryId\" IS NULL')
        }
        if (filterOptions?.notOaCatId !== undefined) {
            if (filterOptions?.notOaCatId) query = query.andWhere('publication.\"oaCategoryId\" <> :notOaCatId', { notOaCatId: filterOptions.notOaCatId })
            else query = query.andWhere('publication.\"oaCategoryId\" IS NOT NULL')
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
        return query;
    }
}

