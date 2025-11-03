import { Entity } from "typeorm";
import { AliasInstitute as IAliasInstitute } from "../../../output-interfaces/Alias";
import { createAliasEntity } from "../common/entities/alias.entity";
import { Institute } from "./Institute.entity";

const AliasInstituteBase = createAliasEntity<Institute>(() => Institute);

@Entity()
export class AliasInstitute extends AliasInstituteBase implements IAliasInstitute {}
