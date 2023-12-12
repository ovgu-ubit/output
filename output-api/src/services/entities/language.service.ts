import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Language } from '../../entity/Language';

@Injectable()
export class LanguageService {

    constructor(@InjectRepository(Language) private repository: Repository<Language>) { }

    public save(pub: Language[]) {
        return this.repository.save(pub);
    }

    public get() {
        return this.repository.find();
    }

    public one(id:number) {
        return this.repository.findOne({where:{id}});
    }

    public async findOrSave(title: string): Promise<Language> {
        if (!title) return null;
        let label = await this.identifyLanguage(title);
        let funder: Language;
        funder = await this.repository.findOne({ where: { label: ILike(label) } });
        if (funder) return funder;
        else return await this.repository.save({ label }).catch(e => { throw { origin: 'language-service', text: `Language ${label} could not be inserted` }; });
    }
    
    identifyLanguage(label:string) {
        label = label.toLocaleLowerCase();
        if (label === 'de' || label === 'ger' || label === 'deutsch') return "Deutsch"
        else if (label === 'en' || label === 'eng' || label === 'english' || label === 'englisch') return "Englisch"
        else return "Sonstige";
    }

    public delete(insts:Language[]) {
        return this.repository.delete(insts.map(p => p.id));
    }
}

