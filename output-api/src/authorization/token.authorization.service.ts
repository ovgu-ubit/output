import { HttpService } from "@nestjs/axios";
import { ExecutionContext, Injectable, InternalServerErrorException, Req } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { PermissionDecoration } from "./permission.decorator";
import { AuthorizationService } from "./authorization.service";
import { AppConfigService } from "../config/app-config.service";

@Injectable()
export class TokenAuthorizationService extends AuthorizationService {
    constructor(protected reflector: Reflector, protected configService: AppConfigService, private jwtService: JwtService, private httpService: HttpService) { 
        super(reflector, configService) 
    }

    private AUTH_API:string;

    override async verify(context: ExecutionContext) {
        this.AUTH_API = (await this.configService.get('AUTH_API')).replace(/\/?$/, '/') + 'auth/';
        let request = context.switchToHttp().getRequest();
        if (['false', '0'].includes((await this.configService.get('AUTH'))?.toLowerCase())) { // no authentication required
            request['user'] = { read: true, write: true }
            return true;
        }
        let permissions = this.reflector.get<PermissionDecoration[]>('permissions', context.getHandler());
        // Case I: if no permission array is given, the endpoint is public
        if (!permissions) {
            await this.verifyToken(request, null); //try to read token to enrich the request object
            return true;
        }
        // Case II/III: if permission array is not null, check for valid token first
        return (await this.verifyToken(request, permissions));
    }

    verifyToken(@Req() req: Request, permissions: PermissionDecoration[]): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            let token = req['cookies']['auth-token']
            if (token) {
                this.httpService.get<string>(this.AUTH_API + 'publickey').subscribe({
                    next: data => {
                        let key = data.data;
                        try {
                            let payload = this.jwtService.verify(token, { publicKey: key, algorithms: ['RS256'] });
                            // enrich the request object with user info for further processing
                            req['user'] = payload;
                            req['user']['read'] = payload.permissions.find(e => (e.appname === 'output' && (e.rolename === 'writer' || e.rolename === 'reader' || e.rolename === 'admin' || e.rolename === 'publication_writer')) || (e.appname === null && e.rolename === 'admin'))
                            req['user']['write_publication'] = payload.permissions.find(e => ((e.appname === 'output' && (e.rolename === 'writer' || e.rolename === 'admin' || e.rolename === 'publication_writer')) || (e.appname === null && e.rolename === 'admin')))
                            req['user']['write'] = payload.permissions.find(e => ((e.appname === 'output' && (e.rolename === 'writer' || e.rolename === 'admin')) || (e.appname === null && e.rolename === 'admin')))
                            req['user']['admin'] = payload.permissions.find(e => ((e.appname === 'output' && e.rolename === 'admin') || (e.appname === null && e.rolename === 'admin')))
                            // Case II: if permissions is an empty array, a valid token is required to proceed
                            if (permissions.length === 0) resolve(true);
                            // Case III: if permissions are given, the user is required to posess ANY of them or admin
                            for (let p of permissions) {
                                if (p.role === null && payload.permissions.find(e => e.appname === p.app)) resolve(true);
                                else if (payload.permissions.find(e => e.appname === p.app && e.rolename === p.role)) resolve(true);
                                else if (payload.permissions.find(e => e.appname === null && e.rolename === 'admin')) resolve(true);
                            }
                            resolve(false);
                        } catch (err) {
                            resolve(false);
                        }
                    }, error: err => {
                        throw new InternalServerErrorException();
                    }
                });
            } else resolve(false);
        });
    }
}

