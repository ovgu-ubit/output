import { DynamicModule, forwardRef, Global, Module } from '@nestjs/common';
import { AUTH_SERVICE, AuthorizationService } from './authorization.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { HttpModule, HttpService } from '@nestjs/axios';
import { AppConfigModule } from '../config/app-config.module';
import { ConfigService } from '@nestjs/config';
import { ModuleRef, Reflector } from '@nestjs/core';
import path = require('path');
import * as fs from 'fs';
import { pathToFileURL } from 'url';
import { AppConfigService } from '../config/app-config.service';
import { AccessGuard } from './access.guard';

@Global()
@Module({})
export class AuthorizationModule {
  static forRootAsync(): DynamicModule {
    return {
      module: AuthorizationModule,
      imports: [
        JwtModule.register({}),
        HttpModule.register({
          timeout: 50000,
          maxRedirects: 5,
        }),
        AppConfigModule
      ],
      controllers: [],
      providers: [
        AccessGuard,
        {
        provide: AUTH_SERVICE,
        inject: [AppConfigService, ModuleRef],

        useFactory: async (cfg: AppConfigService, ref: ModuleRef) => {
          const rel = await cfg.get('AUTH_SERVICE_PATH')!;
          const exported = await cfg.get('AUTH_SERVICE_EXPORT')!;
          const abs = path.isAbsolute(rel) ? rel : path.resolve(process.cwd(), "dist/output-api/src/"+rel+".js");
          if (!fs.existsSync(abs)) {
            throw new Error(`AUTH_SERVICE_PATH not found: ${abs}`);
          }

          await ensureTsSupportIfNeeded(abs);
          
          const mod = require(abs)

          const Impl = mod?.[exported];

          if (typeof Impl !== 'function') {
            throw new Error(`Export ${exported} in ${abs} ist keine Klasse/Funktion.`);
          }

          const [reflector, configSvc, jwt, http] = await Promise.all([
          ref.resolve(Reflector, undefined, { strict: false }),
          ref.resolve(AppConfigService, undefined, { strict: false }),
          ref.resolve(JwtService, undefined, { strict: false }),
          ref.resolve(HttpService, undefined, { strict: false }),
]);
          // Wenn die Klasse @Injectable-abhängigkeiten hat, löst ModuleRef.create() diese auf:
          const instance = new Impl(reflector, configSvc, jwt, http)//await ref.create(Impl as any);

          // Sanity-Check auf das erwartete API
          if (typeof (instance as any)?.verify !== 'function') {
            throw new Error(`AuthorizationService in ${abs} hat keine Methode "verify(credentials)"`);
          }
          return instance;
        }
      },],
      exports: [AccessGuard, AUTH_SERVICE]
    }

  }
}

async function ensureTsSupportIfNeeded(absPath: string) {
  if (absPath.endsWith('.ts')) {
    // Nur im Dev nötig: ts-node registrieren, wenn noch nicht aktiv
    // (funktioniert für CJS; für ESM-Projekte ggf. "tsx" nutzen)
    try {
       
      require('ts-node/register/transpile-only');
    } catch {
      // falls ts-node nicht installiert ist, klarer Fehler:
      throw new Error(
        'AUTH_PROVIDER_PATH ist eine .ts-Datei, aber ts-node ist nicht verfügbar. ' +
        'Installiere devDependency "ts-node" oder gib den Pfad zur kompilierten .js-Datei an.',
      );
    }
  }
}