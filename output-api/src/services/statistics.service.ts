
import { Observable, timer } from 'rxjs';
import { take, timeout } from 'rxjs/operators'
import { Injectable } from '@nestjs/common';
import { Publication } from '../entity/Publication';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOptionsWhere, ILike, In, Like, Repository } from 'typeorm';
import { FilterOptions, HighlightOptions } from "../../../output-interfaces/Statistics"
import { ConfigService } from '@nestjs/config';
import { InstitutionService } from './entities/institution.service';
@Injectable()
export class StatisticsService {

    constructor(@InjectRepository(Publication) private pubRepository: Repository<Publication>, private configService:ConfigService, private instService:InstitutionService) { }

    async countPubsByYear(filterOptions?: FilterOptions, highlightOptions?:HighlightOptions) {
        let instIDs = [];
        if (filterOptions?.instituteId) {
            instIDs = [filterOptions.instituteId];
            instIDs = instIDs.concat((await this.instService.findSubInstitutesFlat(filterOptions?.instituteId)).map(e => e.id))
        }

        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin('publication.authorPublications', 'aut_pub')
            .select("extract('Year' from publication.pub_date at time zone 'UTC')", 'pub_year')
            .addSelect("count(distinct publication.id)")
            .groupBy('pub_year')
            .orderBy('pub_year')
            .where('publication.id > 0')
        
        if (highlightOptions?.corresponding) query = query.addSelect('count(distinct CASE WHEN aut_pub.corresponding THEN publication.id ELSE NULL END)', 'highlight')

        if (filterOptions?.corresponding) query = query.andWhere('aut_pub.corresponding = :corr', { corr: true })
        if (filterOptions?.instituteId) query = query.andWhere('aut_pub.\"instituteId\" in (:...instituteIds)', { instituteIds: instIDs })

        return query.getRawMany();
    }

    async corresponding(reporting_year, filterOptions?:FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin('publication.authorPublications', 'aut_pub')
            .select('count(distinct publication.id)', 'count')
            .addSelect('COUNT(distinct (CASE WHEN aut_pub.corresponding THEN publication.id ELSE NULL END))', 'corresponding')
            .where('pub_date between :beginDate and :endDate', { beginDate, endDate })
            .orderBy('count', 'DESC')

        if (filterOptions?.corresponding) query = query.andWhere('aut_pub.corresponding = :corr', { corr: true })
        if (filterOptions?.instituteId) query = query.andWhere('aut_pub.\"instituteId\" = :instituteId', { instituteId: filterOptions.instituteId })

        return query.getRawMany();
    }

    async institute(reporting_year, filterOptions?:FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin('publication.authorPublications', 'aut_pub')
            .leftJoin('aut_pub.institute', 'institute')
            .select("case when institute.label is not null then institute.label else 'Unbekannt' end", 'institute')
            .addSelect('count(distinct publication.id)')
            .where('pub_date between :beginDate and :endDate', { beginDate, endDate })
            .groupBy('institute')
            .orderBy('count', 'DESC')

        if (filterOptions?.corresponding) query = query.andWhere('aut_pub.corresponding = :corr', { corr: true })
        if (filterOptions?.instituteId) query = query.andWhere('aut_pub.\"instituteId\" = :instituteId', { instituteId: filterOptions.instituteId })

        return query.getRawMany();
    }

    async oaCategory(reporting_year, filterOptions?:FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin("publication.oa_category", 'oa_cat')
            .leftJoin('publication.authorPublications', 'aut_pub')
            .select("case when oa_cat.label is not null then oa_cat.label else 'Unbekannt' end", 'oa_cat')
            .addSelect('count(distinct publication.id)')
            .where('pub_date between :beginDate and :endDate', { beginDate, endDate })
            .groupBy('oa_cat')
            .orderBy('count', 'DESC')

        if (filterOptions?.corresponding) query = query.andWhere('authorPublication.corresponding = :corr', { corr: true })
        if (filterOptions?.instituteId) query = query.andWhere('authorPublication.\"instituteId\" = :instituteId', { instituteId: filterOptions.instituteId })

        return query.getRawMany();
    }

    async publisher(reporting_year, filterOptions?:FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin('publication.publisher', 'publisher')
            .leftJoin('publication.authorPublications', 'aut_pub')
            .select("case when publisher.label is not null then publisher.label else 'Unbekannt' end", 'publisher')
            .addSelect('count(distinct publication.id)')
            .where('pub_date between :beginDate and :endDate', { beginDate, endDate })
            .groupBy('publisher')
            .orderBy('count', 'DESC')

        if (filterOptions?.corresponding) query = query.andWhere('authorPublication.corresponding = :corr', { corr: true })
        if (filterOptions?.instituteId) query = query.andWhere('authorPublication.\"instituteId\" = :instituteId', { instituteId: filterOptions.instituteId })

        return query.getRawMany();
    }

    async pub_type(reporting_year, filterOptions?:FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin('publication.pub_type', 'pub_type')
            .leftJoin('publication.authorPublications', 'aut_pub')
            .select("case when pub_type.label is not null then pub_type.label else 'Unbekannt' end", 'pub_type')
            .addSelect('count(distinct publication.id)')
            .where('pub_date between :beginDate and :endDate', { beginDate, endDate })
            .groupBy('pub_type')
            .orderBy('count', 'DESC')

        if (filterOptions?.corresponding) query = query.andWhere('authorPublication.corresponding = :corr', { corr: true })
        if (filterOptions?.instituteId) query = query.andWhere('authorPublication.\"instituteId\" = :instituteId', { instituteId: filterOptions.instituteId })

        return query.getRawMany();
    }

    async contract(reporting_year, filterOptions?:FilterOptions) {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.pubRepository.createQueryBuilder('publication')
            .leftJoin('publication.contract', 'contract')
            .leftJoin('publication.authorPublications', 'aut_pub')
            .select("case when contract.label is not null then contract.label else 'Unbekannt' end", 'contract')
            .addSelect('count(distinct publication.id)')
            .where('pub_date between :beginDate and :endDate', { beginDate, endDate })
            .groupBy('contract')
            .orderBy('count', 'DESC')

        if (filterOptions?.corresponding) query = query.andWhere('authorPublication.corresponding = :corr', { corr: true })
        if (filterOptions?.instituteId) query = query.andWhere('authorPublication.\"instituteId\" = :instituteId', { instituteId: filterOptions.instituteId })

        return query.getRawMany();
    }
}

