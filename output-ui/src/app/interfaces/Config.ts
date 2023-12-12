import { CookieTokenService } from "../security/cookie.token.service";

export interface Config {
    institution:string;
}

export default () => ({
    authorization_service: CookieTokenService
});