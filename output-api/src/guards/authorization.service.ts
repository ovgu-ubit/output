import { HttpService } from "@nestjs/axios";
import { ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { PermissionDecoration } from "./permission.decorator";

@Injectable()
export abstract class AuthorizationService {
    constructor(protected reflector: Reflector, protected configService: ConfigService) { }

    async verify(context: ExecutionContext) {
        if (['false', '0'].includes(this.configService.get('AUTH')?.toLowerCase())) return true;
        let permissions = this.reflector.get<PermissionDecoration[]>('permissions', context.getHandler());
        // Case I: if no permission array is given, the endpoint is public
        if (!permissions) return true;
        let request = context.switchToHttp().getRequest();
        // Case II: if permissions is an empty array, a valid token is required to proceed
        // Case III: if permissions are given, the user is required to posess ANY of them
        return false;
    }
}

    