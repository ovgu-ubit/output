import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from "@nestjs/typeorm";
import { DataSourceOptions } from "typeorm";
import { DatabaseType } from "typeorm/driver/types/DatabaseType";
import path from "node:path";

@Injectable()
export class DatabaseConfigService implements TypeOrmOptionsFactory {

    constructor(private configService: ConfigService) {}

    createTypeOrmOptions(): TypeOrmModuleOptions {
        return {
            autoLoadEntities: true,
            dropSchema: ['true', '1'].includes(this.configService.get<string>('DATABASE_DROPSCHEMA')?.toLowerCase()),
            type: this.configService.get<DatabaseType>('DATABASE_TYPE'),
            host: this.configService.get<string>('DATABASE_HOST'),
            port: this.configService.get<number>('DATABASE_PORT'),
            database: this.configService.get<string>('DATABASE_NAME'),
            username: this.configService.get<string>('DATABASE_USER'),
            password: this.configService.get<string>('DATABASE_PASSWORD'),
            synchronize: false,
            logging: false,
            entities: [
                path.join(__dirname, "..", "**", "*.entity{.ts,.js}")
            ],
            migrations: [
                path.join(__dirname, "..", "migrations", "*{.ts,.js}")
            ],
            subscribers: [
                path.join(__dirname, "..", "subscriber", "**", "*{.ts,.js}")
            ],
        } as DataSourceOptions;
    }
}
