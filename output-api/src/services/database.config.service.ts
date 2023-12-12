import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from "@nestjs/typeorm";
import { DataSourceOptions } from "typeorm";
import { DatabaseType } from "typeorm/driver/types/DatabaseType";

@Injectable()
export class DatabaseConfigService implements TypeOrmOptionsFactory {

    constructor(private configService: ConfigService) { }

    createTypeOrmOptions(): TypeOrmModuleOptions {
        return {
            dropSchema: ['true', '1'].includes(this.configService.get<string>('DATABASE_DROPSCHEMA').toLowerCase()),
            type: this.configService.get<DatabaseType>('DATABASE_TYPE'),
            host: this.configService.get<string>('DATABASE_HOST'),
            port: this.configService.get<number>('DATABASE_PORT'),
            database: this.configService.get<string>('DATABASE_NAME'),
            username: this.configService.get<string>('DATABASE_USER'),
            password: this.configService.get<string>('DATABASE_PASSWORD'),
            synchronize: true,
            logging: false,
            entities: [
                "dist/output-api/src/entity/**/*.js"
            ],
            migrations: [
                "dist/output-api/src/migration/**/*.js"
            ],
            subscribers: [
                "dist/output-api/src/subscriber/**/*.js"
            ],
        } as DataSourceOptions;
    }
}
