import { Entity } from "typeorm";
import {  AliasFunder as IAliasFunder  } from '@output/interfaces';
import { createAliasEntity } from "../common/entities/alias.entity";
import { Funder } from "./Funder.entity";

const AliasFunderBase = createAliasEntity<Funder>(() => Funder);

@Entity()
export class AliasFunder extends AliasFunderBase implements IAliasFunder {}
