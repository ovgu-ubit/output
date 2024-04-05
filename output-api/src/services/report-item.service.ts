import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReportItemService {

    path = this.configService.get('LOG_PATH')

    constructor(private configService:ConfigService) { }

    createReport(type:'Import'|'Enrich'|'Check'|'Export', label:string,by_user:string): string {
        if (!fs.existsSync(this.path)) fs.mkdirSync(this.path)
        /*let obj: ImportReport = {
            label,
            by_user,
            timestamp: new Date(),
            status: 'started',
            report_items: []
        }
        return this.repositoryReport.save(obj);*/
        let filename = `${type}_${label}_${this.format(new Date(),true)}_by_${by_user}.log`;
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
        let res = `\n\nStatus: ${content.status}\nImported: ${content.count_import}\nUpdated: ${content.count_update}`;
        fs.appendFileSync(reportFile, res);
    }

    getReports(type:'Import'|'Enrich'|'Check'|'Export') {
        if (!fs.existsSync(this.path)) throw new InternalServerErrorException("configured LOG path does not exist, report to admin")
        let files = fs.readdirSync(this.path).filter(e => e.startsWith(type));
        return files;
    }
    
    getReport(filename:string):string {
        return fs.readFileSync(this.path+filename).toString();
    }

    deleteReport(filename:string) {
        return fs.rmSync(this.path+filename)
    }

    format(timestamp:Date, filename?:boolean):string {
        let month = timestamp.getMonth()+1 < 10? '0'+(timestamp.getMonth()+1): (timestamp.getMonth()+1);
        let date = timestamp.getDate() < 10? '0'+timestamp.getDate(): timestamp.getDate();
        let hours = timestamp.getHours() < 10? '0'+timestamp.getHours(): timestamp.getHours();
        let minutes = timestamp.getMinutes() < 10? '0'+timestamp.getMinutes(): timestamp.getMinutes();
        let secs = timestamp.getSeconds() < 10? '0'+timestamp.getSeconds(): timestamp.getSeconds();
        let msecs = timestamp.getMilliseconds() < 10? '00'+timestamp.getMilliseconds(): (timestamp.getMilliseconds() < 100? '0'+timestamp.getMilliseconds() : timestamp.getMilliseconds());

        if (!filename) return `${timestamp.getFullYear()}-${month}-${date} ${hours}:${minutes}:${secs}.${msecs}`
        else return `${timestamp.getFullYear()}${month}${date}_${hours}${minutes}${secs}_${msecs}`
    }

}

