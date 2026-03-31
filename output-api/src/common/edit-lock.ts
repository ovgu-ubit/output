export interface EditLockableEntity {
    id?: number;
    locked_at?: Date | null;
}

export class EditLockOwnerStore {
    private static readonly owners = new Map<string, string>();

    static clear(): void {
        this.owners.clear();
    }

    static getOwner(scope: string, id?: number): string | undefined {
        return this.owners.get(this.getKey(scope, id));
    }

    static setOwner(scope: string, id: number, user?: string): void {
        if (!user) return;
        this.owners.set(this.getKey(scope, id), user);
    }

    static release(scope: string, id?: number): void {
        this.owners.delete(this.getKey(scope, id));
    }

    static getKey(scope: string, id?: number): string {
        return `${scope}:${id ?? 'unknown'}`;
    }
}

export function normalizeEditLockDate(value?: Date | string | null): Date | null {
    if (!value) return null;
    return value instanceof Date ? value : new Date(value);
}

export function isExpiredEditLock(value: Date | string | null | undefined, timeoutMs: number): boolean {
    const lockedAt = normalizeEditLockDate(value);
    return !!lockedAt && (Date.now() - lockedAt.getTime()) > timeoutMs;
}
