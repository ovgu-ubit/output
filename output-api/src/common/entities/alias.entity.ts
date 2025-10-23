import { Column, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Alias } from "../../../../output-interfaces/Alias";

type AliasOwner<TElement> = { aliases?: Alias<TElement>[] };

type AliasConstructor<TElement> = new (...args: any[]) => TElement;

type AliasOwnerFactory<TElement> = () => AliasConstructor<TElement>;

export function createAliasEntity<TElement>(ownerFactory: AliasOwnerFactory<TElement>) {
    abstract class AliasEntity implements Alias<TElement> {
        @ManyToOne(ownerFactory, (owner: AliasOwner<TElement>) => owner.aliases, {
            orphanedRowAction: "delete",
        })
        @JoinColumn({
            name: "elementId",
            referencedColumnName: "id",
        })
        element?: TElement;

        @PrimaryColumn()
        elementId?: number;

        @Column()
        @PrimaryColumn()
        alias!: string;
    }

    return AliasEntity;
}
