import { forwardRef, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Config } from './Config.entity';
import { ConfigController } from './ConfigController';
import { AppConfigService } from './app-config.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfig from '../../config';
import { DatabaseConfigService } from './database.config.service';
import { AuthorizationModule } from '../authorization/authorization.module';
import { CONFIG_DEFAULTS } from './config.defaults';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseConfigService
    }),
    TypeOrmModule.forFeature([Config]),
    ConfigModule.forRoot({
      isGlobal: false,
      envFilePath: [(process.env.NODE_ENV) ? `env.${process.env.NODE_ENV}` : 'env.template'],
      load: [appConfig]
    }),
    forwardRef(() => AuthorizationModule)
  ],
  controllers: [ConfigController],
  providers: [AppConfigService, DatabaseConfigService],
  exports: [AppConfigService]
})
export class AppConfigModule implements OnModuleInit {
  constructor(private readonly cfg: AppConfigService) { }

  async onModuleInit() {
    await this.cfg.reconcileDefaults(CONFIG_DEFAULTS); // legt fehlende Keys an
  }

}
