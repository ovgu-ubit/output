import { ExecutionContext, InternalServerErrorException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { of } from "rxjs";
import { AppConfigService } from "../config/app-config.service";
import { PermissionDecoration } from "./permission.decorator";
import { TokenAuthorizationService } from "./token.authorization.service";

const createExecutionContext = (request: any): ExecutionContext => {
    return {
        switchToHttp: () => ({
            getRequest: () => request,
        }),
        getHandler: () => ({}),
    } as unknown as ExecutionContext;
};

describe("TokenAuthorizationService", () => {
    let reflector: Reflector;
    let configService: AppConfigService;
    let jwtService: JwtService;
    let httpService: any;
    let service: TokenAuthorizationService;

    beforeEach(() => {
        reflector = { get: jest.fn() } as unknown as Reflector;
        configService = { get: jest.fn() } as unknown as AppConfigService;
        jwtService = { verify: jest.fn() } as unknown as JwtService;
        httpService = { get: jest.fn() };
        service = new TokenAuthorizationService(reflector, configService, jwtService, httpService);
    });

    it("allows requests when AUTH is disabled", async () => {
        (configService.get as jest.Mock).mockResolvedValueOnce("http://auth/");
        (configService.get as jest.Mock).mockResolvedValueOnce("false");
        const request = { cookies: {} } as any;
        const context = createExecutionContext(request);

        const result = await service.verify(context);

        expect(result).toBe(true);
        expect(request.user).toEqual({ read: true, write: true });
        expect(httpService.get).not.toHaveBeenCalled();
        expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it("enriches request user when token is valid for public endpoint", async () => {
        (configService.get as jest.Mock).mockResolvedValueOnce("http://auth/");
        (configService.get as jest.Mock).mockResolvedValueOnce("true");
        (reflector.get as jest.Mock).mockReturnValue(undefined);
        jwtService.verify = jest.fn().mockReturnValue({
            id: "user-1",
            permissions: [{ appname: "output", rolename: "reader" }],
        });
        httpService.get.mockReturnValue(of({ data: "public-key" }));
        const request: any = { cookies: { "auth-token": "token" } };
        const context = createExecutionContext(request);

        const result = await service.verify(context);

        expect(result).toBe(true);
        expect(jwtService.verify).toHaveBeenCalledWith("token", { publicKey: "public-key", algorithms: ["RS256"] });
        expect(request.user).toMatchObject({
            username: "user-1",
            read: expect.anything(),
            write: undefined,
            admin: undefined,
        });
    });

    it("requires a valid token when permissions array is empty", async () => {
        (configService.get as jest.Mock).mockResolvedValueOnce("http://auth/");
        (configService.get as jest.Mock).mockResolvedValueOnce("true");
        (reflector.get as jest.Mock).mockReturnValue([] as PermissionDecoration[]);
        jwtService.verify = jest.fn().mockReturnValue({
            id: "user-2",
            permissions: [{ appname: "output", rolename: "writer" }],
        });
        httpService.get.mockReturnValue(of({ data: "public-key" }));
        const request: any = { cookies: { "auth-token": "token" } };
        const context = createExecutionContext(request);

        const result = await service.verify(context);

        expect(result).toBe(true);
        expect(request.user.write).toBeTruthy();
    });

    it("denies when token lacks required permission", async () => {
        (configService.get as jest.Mock).mockResolvedValueOnce("http://auth/");
        (configService.get as jest.Mock).mockResolvedValueOnce("true");
        (reflector.get as jest.Mock).mockReturnValue([{ app: "output", role: "admin" }] as PermissionDecoration[]);
        jwtService.verify = jest.fn().mockReturnValue({
            id: "user-3",
            permissions: [{ appname: "output", rolename: "reader" }],
        });
        httpService.get.mockReturnValue(of({ data: "public-key" }));
        const request: any = { cookies: { "auth-token": "token" } };
        const context = createExecutionContext(request);

        const result = await service.verify(context);

        expect(result).toBe(false);
    });

    it("propagates server errors when public key lookup fails", async () => {
        (configService.get as jest.Mock).mockResolvedValueOnce("http://auth/");
        (configService.get as jest.Mock).mockResolvedValueOnce("true");
        (reflector.get as jest.Mock).mockReturnValue([] as PermissionDecoration[]);
        httpService.get.mockImplementation(() => ({
            subscribe: () => {
                throw new InternalServerErrorException();
            },
        }));
        const request: any = { cookies: { "auth-token": "token" } };
        const context = createExecutionContext(request);

        await expect(service.verify(context)).rejects.toBeInstanceOf(InternalServerErrorException);
    });
});
