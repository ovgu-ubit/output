import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AuthorizationService } from "./authorization.service";

@Injectable()
export class AccessGuard implements CanActivate {
    constructor(private authorizationService: AuthorizationService) { }

    async canActivate(context: ExecutionContext) {
        return await this.authorizationService.verify(context);
    }
}