type AliasConstructor<TElement> = new (...args: any[]) => TElement;
type AliasOwnerFactory<TElement> = () => AliasConstructor<TElement>;
export declare function createAliasEntity<TElement>(ownerFactory: AliasOwnerFactory<TElement>): abstract new () => {
    element?: TElement;
    elementId?: number;
    alias: string;
};
export {};
