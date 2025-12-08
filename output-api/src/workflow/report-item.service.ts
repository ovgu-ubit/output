import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import { Cron } from '@nestjs/schedule';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class ReportItemService {

    path:string;

    constructor(private configService:AppConfigService) {}

    async init() {
        this.path = await this.configService.get('APP_LOG_PATH')
        if (!fs.existsSync(this.path)) fs.mkdirSync(this.path)
    }

    async createReport(type:'Import'|'Enrich'|'Check'|'Export', label:string,by_user:string) {
        await this.init();
        const filename = `${type}_${label}_${this.format(new Date(),true)}_by_${by_user}.log`;
        fs.writeFileSync(this.path+filename,'')
        return this.path+filename;
    }

    write(reportFile:string, content:{type:string, publication_id?:number, publication_doi?:string, publication_title?:string, timestamp: Date, origin: string, text: string}) {
        let res = `${this.format(content.timestamp)} [${content.type}] @ ${content.origin}: ${content.text}`;
        if (content.publication_id) res+=` - ID ${content.publication_id}`
        else if (content.publication_doi || content.publication_title) res+=` - DOI: ${content.publication_doi} - Title: ${content.publication_title}`
        fs.appendFileSync(reportFile, res+"\n");
    }

    finish(reportFile:string, content:{status:string, count_import?:number, count_update?:number}) {
        const res = `\n\nStatus: ${content.status}\nImported: ${content.count_import}\nUpdated: ${content.count_update}`;
        fs.appendFileSync(reportFile, res);
    }

    async getReports(type:'Import'|'Enrich'|'Check'|'Export') {
        await this.init();
        const files = fs.readdirSync(this.path).filter(e => e.startsWith(type));
        return files;
    }
    
    async getReport(filename:string) {
        await this.init();
        return fs.readFileSync(this.path+filename).toString();
    }

    async deleteReport(filename:string) {
        await this.init();
        return fs.rmSync(this.path+filename)
    }

    @Cron('15 55 22 * * *') // 22:55:15 at every day
    public async deleteOldFiles() {
        await this.init();
        if (!this.path.endsWith("/")) this.path += "/";
        const now = new Date();
        console.log("Delete run at "+now)
        const files = fs.readdirSync(this.path, { withFileTypes: true });
        for (const file of files) {
            if (file.isDirectory()) continue;
            const stat = fs.statSync(this.path + file.name);
            const days = 93;
            if (file.isFile() && (now.getTime() - new Date(stat["ctime"]).getTime()) > days * 24 * 60 * 60 * 1000) {
                console.log("Deleting "+this.path + file.name)
                fs.rmSync(this.path + file.name)
            }
        }
    }

    format(timestamp:Date, filename?:boolean):string {
        const month = timestamp.getMonth()+1 < 10? '0'+(timestamp.getMonth()+1): (timestamp.getMonth()+1);
        const date = timestamp.getDate() < 10? '0'+timestamp.getDate(): timestamp.getDate();
        const hours = timestamp.getHours() < 10? '0'+timestamp.getHours(): timestamp.getHours();
        const minutes = timestamp.getMinutes() < 10? '0'+timestamp.getMinutes(): timestamp.getMinutes();
        const secs = timestamp.getSeconds() < 10? '0'+timestamp.getSeconds(): timestamp.getSeconds();
        const msecs = timestamp.getMilliseconds() < 10? '00'+timestamp.getMilliseconds(): (timestamp.getMilliseconds() < 100? '0'+timestamp.getMilliseconds() : timestamp.getMilliseconds());

        if (!filename) return `${timestamp.getFullYear()}-${month}-${date} ${hours}:${minutes}:${secs}.${msecs}`
        else return `${timestamp.getFullYear()}${month}${date}_${hours}${minutes}${secs}_${msecs}`
    }

}

