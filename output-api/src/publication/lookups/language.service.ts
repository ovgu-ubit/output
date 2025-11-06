import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Language } from './Language.entity';

@Injectable()
export class LanguageService {

    constructor(@InjectRepository(Language) private repository: Repository<Language>) { }

    public save(pub: Language[]) {
        return this.repository.save(pub).catch(err => {
            if (err.constraint) throw new BadRequestException(err.detail)
            else throw new InternalServerErrorException(err);
        });
    }

    public get() {
        return this.repository.find();
    }

    public one(id:number) {
        return this.repository.findOne({where:{id}});
    }

    public async findOrSave(title: string, dryRun = false): Promise<Language> {
        if (!title) return null;
        let label = await this.identifyLanguage(title);
        let funder: Language;
        funder = await this.repository.findOne({ where: { label: ILike(label) } });
        if (funder || dryRun) return funder;
        else return await this.repository.save({ label }).catch(e => { throw { origin: 'language-service', text: `Language ${label} could not be inserted` }; });
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

