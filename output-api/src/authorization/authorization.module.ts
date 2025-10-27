import { forwardRef, Module } from '@nestjs/common';
import appConfig from '../../config';
import { AuthorizationService } from './authorization.service';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { AppConfigModule } from '../config/app-config.module';


@Module({
  imports: [
    JwtModule.register({}),
    HttpModule.register({
      timeout: 50000,
      maxRedirects: 5,
    }),
    forwardRef(() => AppConfigModule)
  ],
  controllers: [],
  providers: [{ provide: AuthorizationService, useClass: appConfig().authorization_service },],
  exports: [AuthorizationService]
})
export class AuthorizationModule { }
