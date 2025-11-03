import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { AUTH_SERVICE, AuthorizationService, IAuthorizationService } from "./authorization.service";

@Injectable()
export class AccessGuard implements CanActivate {
    constructor(@Inject(AUTH_SERVICE) private authorizationService: IAuthorizationService) { }

    async canActivate(context: ExecutionContext) {
        return await this.authorizationService.verify(context);
    }
}