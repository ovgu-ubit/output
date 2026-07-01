import { DataSource, DataSourceOptions } from "typeorm";
import { DatabaseType } from "typeorm/driver/types/DatabaseType";
import { config as config } from "dotenv";
import path from "node:path";

const configDir = process.env.CONFIG_DIR || process.cwd();
const sourceRoot = path.resolve(__dirname, "..");

config({
    path: path.resolve(configDir, `env.${process.env.NODE_ENV}`)
});

// AppDataSource is necessary for migrations
export const AppDataSource = new DataSource(<DataSourceOptions>{
    dropSchema: ['true', '1'].includes(process.env.DATABASE_DROPSCHEMA?.toLowerCase()),
    type: <DatabaseType>process.env.DATABASE_TYPE,
    host: <string>process.env.DATABASE_HOST,
    port: <number><unknown>process.env.DATABASE_PORT,
    database: <string>process.env.DATABASE_NAME,
    username: <string>process.env.DATABASE_USER,
    password: <string>process.env.DATABASE_PASSWORD,
    synchronize: ['true', '1'].includes(process.env.DATABASE_SYNCHRONIZE?.toLowerCase()),
    logging: false,
    entities: [
        path.join(sourceRoot, "**", "*.entity{.ts,.js}")
    ],
    migrations: [
        path.join(sourceRoot, "migrations", "*{.ts,.js}")
    ],
    subscribers: [
        path.join(sourceRoot, "subscriber", "**", "*{.ts,.js}")
    ],
})
