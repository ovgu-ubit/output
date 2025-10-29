import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionDecoration } from "./permission.decorator";
import { AppConfigService } from "../config/app-config.service";

export const AUTH_SERVICE = Symbol('AUTH_SERVICE');

export interface IAuthorizationService {
    verify(context: ExecutionContext):Promise<boolean>;
}

@Injectable()
export abstract class AuthorizationService implements IAuthorizationService{
    constructor(protected reflector: Reflector, protected configService: AppConfigService) { }

    /**
     * returns true if the user is allowed to access the resource and enrichs the request object with a user object
     * containing at least {read:boolean, write_publication:boolean, write:boolean, admin:boolean}
     * @param context 
     * @returns 
     */
    async verify(context: ExecutionContext) {
        let request = context.switchToHttp().getRequest();
        if (['false', '0'].includes((await this.configService.get('AUTH'))?.toLowerCase())) {
            request['user'] = { read: true, write_publication: true ,write: true, admin: true }
            return true;
        }
        let permissions = this.reflector.get<PermissionDecoration[]>('permissions', context.getHandler());
        // Case I: if no permission array is given, the endpoint is public
        if (!permissions) return true;
        // Case II: if permissions is an empty array, a valid token is required to proceed
        // Case III: if permissions are given, the user is required to posess ANY of them
        return false;
    }
}

    