import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AbstractCrudController } from "../../common/abstract-crud.controller";
import { Role } from "./Role.entity";
import { RoleService } from "./role.service";

@Controller("role")
@ApiTags("role")
export class RoleController extends AbstractCrudController<Role, RoleService> {
    constructor(roleService: RoleService) {
        super(roleService);
    }
}
