import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/app-config.module';
import { DEMO_RESET_PROCESS_RUNNER, DemoResetService, runPsqlProcess } from './demo-reset.service';

@Module({
    imports: [AppConfigModule],
    providers: [
        DemoResetService,
        {
            provide: DEMO_RESET_PROCESS_RUNNER,
            useValue: runPsqlProcess
        }
    ],
    exports: [DemoResetService]
})
export class DemoResetModule { }
