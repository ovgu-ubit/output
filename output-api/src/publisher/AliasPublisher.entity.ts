import { Entity } from "typeorm";
import { AliasPublisher as IAliasPublisher } from "../../../output-interfaces/Alias";
import { createAliasEntity } from "../common/entities/alias.entity";
import { Publisher } from "./Publisher.entity";

const AliasPublisherBase = createAliasEntity<Publisher>(() => Publisher);

@Entity()
export class AliasPublisher extends AliasPublisherBase implements IAliasPublisher {}
