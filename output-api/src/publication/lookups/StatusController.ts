import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AbstractCrudController } from "../../common/abstract-crud.controller";
import { Status } from "./Status.entity";
import { StatusService } from "./status.service";

@Controller("status")
@ApiTags("status")
export class StatusController extends AbstractCrudController<Status, StatusService> {
    constructor(statusService: StatusService) {
        super(statusService);
    }
}
