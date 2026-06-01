import { ExecutionContext, HttpException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { of, throwError } from "rxjs";
import {  ApiErrorCode  } from '@output/interfaces';
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
    let demoAuthService: any;
    let service: TokenAuthorizationService;

    beforeEach(() => {
        reflector = { get: jest.fn() } as unknown as Reflector;
        configService = { get: jest.fn() } as unknown as AppConfigService;
        jwtService = { verify: jest.fn() } as unknown as JwtService;
        httpService = { get: jest.fn() };
        demoAuthService = { isDemoMode: jest.fn().mockResolvedValue(false), getPublicKey: jest.fn() };
        service = new TokenAuthorizationService(reflector, configService, jwtService, httpService, demoAuthService);
    });

    it("allows requests when AUTH is disabled", async () => {
        (configService.get as jest.Mock).mockImplementation(async (key: string) => {
            if (key === "AUTH") return "false";
            return undefined;
        });
        const request = { cookies: {} } as any;
        const context = createExecutionContext(request);

        const result = await service.verify(context);

        expect(result).toBe(true);
        expect(request.user).toEqual({ username: "unknown", read: true, write_publication: true, write: true, admin: true });
        expect(httpService.get).not.toHaveBeenCalled();
        expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it("enriches request user when token is valid for public endpoint", async () => {
        (configService.get as jest.Mock).mockImplementation(async (key: string) => {
            if (key === "AUTH") return "true";
            if (key === "AUTH_API") return "http://auth/";
            return undefined;
        });
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
        (configService.get as jest.Mock).mockImplementation(async (key: string) => {
            if (key === "AUTH") return "true";
            if (key === "AUTH_API") return "http://auth/";
            return undefined;
        });
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
        (configService.get as jest.Mock).mockImplementation(async (key: string) => {
            if (key === "AUTH") return "true";
            if (key === "AUTH_API") return "http://auth/";
            return undefined;
        });
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
        (configService.get as jest.Mock).mockImplementation(async (key: string) => {
            if (key === "AUTH") return "true";
            if (key === "AUTH_API") return "http://auth/";
            return undefined;
        });
        (reflector.get as jest.Mock).mockReturnValue([] as PermissionDecoration[]);
        httpService.get.mockReturnValue(throwError(() => new Error("lookup failed")));
        const request: any = { cookies: { "auth-token": "token" } };
        const context = createExecutionContext(request);

        try {
            await service.verify(context);
            fail("service.verify should reject when public key lookup fails");
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 500,
                code: ApiErrorCode.INTERNAL_ERROR,
            });
        }
    });

    it("verifies demo tokens with the local demo public key", async () => {
        (configService.get as jest.Mock).mockImplementation(async (key: string) => {
            if (key === "AUTH") return "true";
            return undefined;
        });
        demoAuthService.isDemoMode.mockResolvedValue(true);
        demoAuthService.getPublicKey.mockReturnValue("demo-public-key");
        (reflector.get as jest.Mock).mockReturnValue([{ app: "output", role: "admin" }] as PermissionDecoration[]);
        jwtService.verify = jest.fn().mockReturnValue({
            id: "demo",
            permissions: [{ appname: "output", rolename: "admin" }],
        });
        const request: any = { cookies: { "auth-token": "token" } };
        const context = createExecutionContext(request);

        const result = await service.verify(context);

        expect(result).toBe(true);
        expect(jwtService.verify).toHaveBeenCalledWith("token", { publicKey: "demo-public-key", algorithms: ["RS256"] });
        expect(httpService.get).not.toHaveBeenCalled();
        expect(request.user.admin).toBeTruthy();
    });
});
