import { DataSource, DataSourceOptions } from "typeorm";
import { DatabaseType } from "typeorm/driver/types/DatabaseType";
import { config as config } from "dotenv";
import path = require("path");

console.log("# environment is: ", process.env.NODE_ENV);
config({
    path: path.resolve(__dirname, `../../env.${process.env.NODE_ENV}`)
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
        "dist/output-api/src/**/*.entity.js",
        "dist/output-api/src/**/*.entity.ts"
    ],
    migrations: [
        "dist/output-api/src/migrations/**/*.js",
        "dist/output-api/src/migrations/**/*.ts"
    ],
    subscribers: [
        "dist/output-api/src/subscriber/**/*.js",
        "dist/output-api/src/subscriber/**/*.ts"
    ],
})