import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Config } from './Config.entity';
import { ConfigController } from './ConfigController';
import { AppConfigService } from './app-config.service';
import { CONFIG_DEFAULTS, CONFIG_DESCRIPTIONS } from './config.defaults';
import { DatabaseConfigService } from './database.config.service';
import { EnvSchemas } from './environment.schema';
import path from 'path';

const configDir = process.env.CONFIG_DIR || process.cwd();

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseConfigService
    }),
    TypeOrmModule.forFeature([Config]),
    ConfigModule.forRoot({
      isGlobal: false,
      envFilePath: [(process.env.NODE_ENV) ? path.resolve(configDir, `env.${process.env.NODE_ENV}`) : path.resolve(configDir, 'env.template')],
      validate: (env) => {
        const schema = EnvSchemas
          .passthrough();

        const result = schema.safeParse(env);
        if (!result.success) {
          throw new Error(`Invalid environment configuration: ${result.error}`);
        }
        return result.data;
      }
    })
  ],
  controllers: [ConfigController],
  providers: [AppConfigService, DatabaseConfigService],
  exports: [AppConfigService]
})
export class AppConfigModule implements OnModuleInit {
  constructor(private readonly cfg: AppConfigService) { }

  async onModuleInit() {
    await this.cfg.reconcileDefaults(CONFIG_DEFAULTS, CONFIG_DESCRIPTIONS); // legt fehlende Keys an
  }

}
