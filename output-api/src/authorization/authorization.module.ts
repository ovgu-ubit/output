import { Module } from '@nestjs/common';
import appConfig from '../../config';
import { AuthorizationService } from './authorization.service';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';


@Module({
  imports: [
    JwtModule.register({}),
    HttpModule.register({
      timeout: 50000,
      maxRedirects: 5,
    }),],
  controllers: [],
  providers: [{ provide: AuthorizationService, useClass: appConfig().authorization_service },],
  exports: [AuthorizationService]
})
export class AuthorizationModule { }
