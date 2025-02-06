import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ReportItemService {

    path:string;

    constructor(private configService:ConfigService) {
        this.path = this.configService.get('LOG_PATH')
     }

    createReport(type:'Import'|'Enrich'|'Check'|'Export', label:string,by_user:string): string {
        if (!fs.existsSync(this.path)) fs.mkdirSync(this.path)
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

    @Cron('15 55 22 * * *') // 22:55:15 at every day
    public deleteOldFiles() {
        if (!fs.existsSync(this.path)) throw new InternalServerErrorException("configured LOG path does not exist, report to admin")
        if (!this.path.endsWith("/")) this.path += "/";
        let now = new Date();
        console.log("Delete run at "+now)
        let files = fs.readdirSync(this.path, { withFileTypes: true });
        for (let file of files) {
            if (file.isDirectory()) continue;
            let stat = fs.statSync(this.path + file.name);
            let days = 93;
            if (file.isFile() && (now.getTime() - new Date(stat["ctime"]).getTime()) > days * 24 * 60 * 60 * 1000) {
                console.log("Deleting "+this.path + file.name)
                fs.rmSync(this.path + file.name)
            }
        }
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

