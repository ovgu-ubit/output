import 'multer';
import { createInvalidRequestHttpException } from './api-error';

export const DEMO_UPLOAD_MAX_BYTES = 1024 * 1024;
export const DEMO_UPLOAD_MAX_LABEL = '1 MB';

export function isDemoModeValue(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return ['true', '1'].includes(value.toLowerCase());
    return false;
}

export function assertDemoUploadAllowed(file: Express.Multer.File | undefined, allowedExtensions: string[]): void {
    if (!file) return;

    const normalizedExtensions = allowedExtensions.map(normalizeExtension);
    const fileExtension = getFileExtension(file.originalname);

    if (!fileExtension || !normalizedExtensions.includes(fileExtension)) {
        throw createInvalidRequestHttpException(
            `In der Demo-Version sind nur Dateien mit folgenden Endungen erlaubt: ${normalizedExtensions.join(', ')}.`,
        );
    }

    if (file.size > DEMO_UPLOAD_MAX_BYTES) {
        throw createInvalidRequestHttpException(
            `In der Demo-Version sind Uploads auf ${DEMO_UPLOAD_MAX_LABEL} begrenzt.`,
        );
    }
}

function normalizeExtension(extension: string): string {
    const trimmed = extension.trim().toLowerCase();
    return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
}

function getFileExtension(filename?: string): string | null {
    if (!filename) return null;
    const lastDot = filename.lastIndexOf('.');
    if (lastDot < 0 || lastDot === filename.length - 1) return null;
    return filename.slice(lastDot).toLowerCase();
}
