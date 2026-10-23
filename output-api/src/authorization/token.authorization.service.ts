import { HttpService } from "@nestjs/axios";
import { ExecutionContext, Injectable, Req } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { firstValueFrom } from "rxjs";
import { ApplicationPermission, hasApplicationRole } from '@output/interfaces';
import { createInternalErrorHttpException } from "../common/api-error";
import { AppConfigService } from "../config/app-config.service";
import { DemoAuthService } from "../demo-auth/demo-auth.service";
import { AuthorizationService } from "./authorization.service";
import { PermissionDecoration } from "./permission.decorator";

@Injectable()
export class TokenAuthorizationService extends AuthorizationService {
    constructor(
        protected reflector: Reflector,
        protected configService: AppConfigService,
        private jwtService: JwtService,
        private httpService: HttpService,
        private demoAuthService?: DemoAuthService,
    ) {
        super(reflector, configService)
    }

    private AUTH_API: string;

    override async verify(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        if (['false', '0'].includes((await this.configService.get('AUTH'))?.toLowerCase())) { // no authentication required
            request['user'] = { username: "unknown", read: true, write_publication: true, write: true, admin: true }
            return true;
        }
        const permissions = this.reflector.get<PermissionDecoration[]>('permissions', context.getHandler());
        // Case I: if no permission array is given, the endpoint is public
        if (!permissions) {
            await this.verifyToken(request, null); //try to read token to enrich the request object
            return true;
        }
        // Case II/III: if permission array is not null, check for valid token first
        return (await this.verifyToken(request, permissions));
    }

    async verifyToken(@Req() req: Request, permissions: PermissionDecoration[]): Promise<boolean> {
        const token = req['cookies']?.['auth-token'];
        if (!token) return false;

        const key = await this.resolvePublicKey();
        try {
            const payload = this.jwtService.verify(token, { publicKey: key, algorithms: ['RS256'] });
            this.enrichRequest(req, payload);
            return this.hasRequiredPermissions(payload.permissions, permissions);
        } catch (err) {
            console.log(err)
            return false;
        }
    }

    private async resolvePublicKey(): Promise<string> {
        if (this.demoAuthService && await this.demoAuthService.isDemoMode()) {
            return this.demoAuthService.getPublicKey();
        }

        this.AUTH_API = (await this.configService.get('AUTH_API')).replace(/\/?$/, '/') + 'auth/';
        try {
            const data = await firstValueFrom(this.httpService.get<string>(this.AUTH_API + 'publickey'));
            return data.data;
        } catch (err) {
            console.log(err)
            throw createInternalErrorHttpException();
        }
    }

    private enrichRequest(req: Request, payload: any) {
        // enrich the request object with user info for further processing
        req['user'] = payload;
        req['user']['username'] = payload.id
        const permissions = payload.permissions as ApplicationPermission[];
        const hasRole = (...roles: string[]) => roles.some(role => hasApplicationRole(permissions, 'output', role));

        req['user']['read'] = hasRole('writer', 'reader', 'admin');
        req['user']['write_publication'] = hasRole('writer', 'admin', 'publication_writer');
        req['user']['write'] = hasRole('writer', 'admin');
        req['user']['admin'] = hasRole('admin');
    }

    private hasRequiredPermissions(permissions: ApplicationPermission[], requiredPermissions: PermissionDecoration[]) {
        // Case I/II: if permissions is an empty array, a valid token is required to proceed
        if (!requiredPermissions || requiredPermissions.length === 0) return true;
        // Case III: if permissions are given, the user is required to posess ANY of them or admin
        return requiredPermissions.some(permission => hasApplicationRole(permissions, permission.app, permission.role));
    }
}
