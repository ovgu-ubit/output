import { DynamicModule, forwardRef, Global, Module } from '@nestjs/common';
import { AUTH_SERVICE, AuthorizationService } from './authorization.service';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { AppConfigModule } from '../config/app-config.module';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import path = require('path');
import * as fs from 'fs';
import { pathToFileURL } from 'url';
import { AppConfigService } from '../config/app-config.service';

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
        forwardRef(() => AppConfigModule)
      ],
      controllers: [],
      providers: [{
        provide: AuthorizationService,
        inject: [AppConfigService, ModuleRef],

        useFactory: async (cfg: ConfigService, ref: ModuleRef) => {
          const rel = await cfg.get<string>('authorization_service')!;
          const exported = await cfg.get<string>('authorization_export')!;
          const abs = path.isAbsolute(rel) ? rel : path.resolve(process.cwd(), rel);
          if (!fs.existsSync(abs)) {
            throw new Error(`authorization_service not found: ${abs}`);
          }

          await ensureTsSupportIfNeeded(abs);
          

          // dynamisch importieren (ESM-kompatibel)
          //const modUrl = pathToFileURL(abs).toString();
          //const mod = await import(modUrl);
          const mod = require(abs)

          const Impl = mod?.[exported];

          if (typeof Impl !== 'function') {
            throw new Error(`Export ${exported} in ${abs} ist keine Klasse/Funktion.`);
          }

          // Wenn die Klasse @Injectable-abhängigkeiten hat, löst ModuleRef.create() diese auf:
          const instance = await ref.create(Impl as any);

          // Sanity-Check auf das erwartete API
          if (typeof (instance as any)?.verify !== 'function') {
            throw new Error(`AuthorizationService in ${abs} hat keine Methode "validate(credentials)"`);
          }
          return instance;
        }
      },],
      exports: [AuthorizationService]
    }

  }
}

async function ensureTsSupportIfNeeded(absPath: string) {
  if (absPath.endsWith('.ts')) {
    // Nur im Dev nötig: ts-node registrieren, wenn noch nicht aktiv
    // (funktioniert für CJS; für ESM-Projekte ggf. "tsx" nutzen)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
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