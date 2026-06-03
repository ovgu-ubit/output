import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Language } from './Language.entity';
import { createNotFoundHttpException, createPersistenceHttpException } from '../../common/api-error';
import { AppConfigService } from '../../config/app-config.service';
import { AbstractEntityService } from '../../common/abstract-entity.service';

@Injectable()
export class LanguageService extends AbstractEntityService<Language> {

    constructor(
        @InjectRepository(Language) repository: Repository<Language>,
        configService: AppConfigService,
    ) {
        super(repository, configService);
    }

    public override one(id:number) {
        return this.repository.findOne({where:{id}});
    }

    public override async oneOrFail(id: number, _writer = false, _user?: string, message = 'Language not found.') {
        const language = await this.one(id);
        if (!language) throw createNotFoundHttpException(message);
        return language;
    }

    public async findOrSave(title: string, dryRun = false): Promise<Language> {
        if (!title) return null;
        const label = await this.identifyLanguage(title);
        let funder: Language;
        funder = await this.repository.findOne({ where: { label: ILike(label) } });
        if (funder || dryRun) return funder;
        else {
            return await this.repository.save({ label }).catch((error: unknown) => {
                throw createPersistenceHttpException(error);
            });
        }
    }
    
    identifyLanguage(label:string) {
        label = label.toLocaleLowerCase();
        if (label === 'de' || label === 'ger' || label === 'deutsch' || label === 'german') return "de"
        else if (label === 'en' || label === 'eng' || label === 'english' || label === 'englisch') return "en"
        else if (label === 'fr' || label === 'fra' || label === 'fre' || label === 'french' || label === 'francaise') return "fr"
        else if (label === 'es' || label === 'spa' || label === 'spanish' || label === 'espanol') return "es"
        else if (label === 'ru' || label === 'rus' || label === 'russian' || label === 'русский') return "ru"
        else return "Sonstige";
    }

    public delete(insts:Language[]) {
        return this.repository.delete(insts.map(p => p.id));
    }
}
