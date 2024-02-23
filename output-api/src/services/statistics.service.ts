
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


        query = this.addFilter(query, filterOptions, highlightOptions)

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

        query = this.addFilter(query, filterOptions)

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
            .where('pub_date between :beginDate and :endDate', { beginDate, endDate })
            .groupBy('institute')

        query = this.addStat(query, costs)
        query = this.addFilter(query, filterOptions)

        return query.getRawMany();
    }

    async oaCategory(reporting_year, costs: boolean, filterOptions?: FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin("publication.oa_category", 'oa_cat')
            .leftJoin('publication.authorPublications', 'aut_pub')
            .select("case when oa_cat.label is not null then oa_cat.label else 'Unbekannt' end", 'oa_cat')
            .where('pub_date between :beginDate and :endDate', { beginDate, endDate })
            .groupBy('oa_cat')

        query = this.addStat(query, costs)
        query = this.addFilter(query, filterOptions)

        return query.getRawMany();
    }

    async publisher(reporting_year, costs: boolean, filterOptions?: FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin('publication.publisher', 'publisher')
            .leftJoin('publication.authorPublications', 'aut_pub')
            .select("case when publisher.label is not null then publisher.label else 'Unbekannt' end", 'publisher')
            .where('pub_date between :beginDate and :endDate', { beginDate, endDate })
            .groupBy('publisher')

        query = this.addStat(query, costs)
        query = this.addFilter(query, filterOptions)

        return query.getRawMany();
    }

    async pub_type(reporting_year, costs: boolean, filterOptions?: FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin('publication.pub_type', 'pub_type')
            .leftJoin('publication.authorPublications', 'aut_pub')
            .select("case when pub_type.label is not null then pub_type.label else 'Unbekannt' end", 'pub_type')
            .where('pub_date between :beginDate and :endDate', { beginDate, endDate })
            .groupBy('pub_type')

        query = this.addStat(query, costs)
        query = this.addFilter(query, filterOptions)

        return query.getRawMany();
    }

    async contract(reporting_year, costs: boolean, filterOptions?: FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin('publication.contract', 'contract')
            .select("case when contract.label is not null then contract.label else 'Unbekannt' end", 'contract')
            .where('pub_date between :beginDate and :endDate', { beginDate, endDate })
            .groupBy('contract')

        query = this.addStat(query, costs)
        query = this.addFilter(query, filterOptions)

        return query.getRawMany();
    }

    addStat(query: SelectQueryBuilder<Publication>, costs: boolean) {
        if (!costs) query = query.addSelect('count(distinct publication.id) as value')
        else query = query.leftJoin("publication.invoices", "invoice")
            .leftJoin("invoice.cost_items", "cost_item")
            .addSelect("sum(CASE WHEN cost_item.euro_value IS NULL THEN 0 ELSE cost_item.euro_value END) as value")
        return query.orderBy('value', 'DESC');
    }

    addFilter(query: SelectQueryBuilder<Publication>, filterOptions: FilterOptions, highlightOptions?:HighlightOptions) {
        let autPub = false;

        if (filterOptions?.corresponding) {
            autPub = true;
            query = query.andWhere('aut_pub.corresponding = :corr', { corr: true })
        }
        if (filterOptions?.instituteId) {
            autPub = true;
            query = query.andWhere('aut_pub.\"instituteId\" = :instituteId', { instituteId: filterOptions.instituteId })
        }
        if (filterOptions?.publisherId) query = query.andWhere('publication.\"publisherId\" = :publisherId', { publisherId: filterOptions.publisherId })
        if (filterOptions?.contractId) query = query.andWhere('publication.\"contractId\" = :contractId', { contractId: filterOptions.contractId })
        if (filterOptions?.pubTypeId) query = query.andWhere('publication.\"pubTypeId\" = :pubTypeId', { pubTypeId: filterOptions.pubTypeId })
        if (filterOptions?.oaCatId) query = query.andWhere('publication.\"oaCategoryId\" = :oaCatId', { oaCatId: filterOptions.oaCatId })

        if (highlightOptions?.corresponding) {
            autPub = true;
            query = query.addSelect('count(distinct CASE WHEN aut_pub.corresponding THEN publication.id ELSE NULL END)', 'highlight')
        }

        if (autPub) query = query.leftJoin('publication.authorPublications', 'aut_pub')

        return query;
    }
}

