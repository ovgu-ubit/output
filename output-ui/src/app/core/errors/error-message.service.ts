import { Injectable } from '@angular/core';
import { ApiErrorCode } from '../../../../../output-interfaces/ApiError';
import { UiError, UiErrorContext } from './ui-error';

@Injectable({
  providedIn: 'root'
})
export class ErrorMessageService {
  getMessage(error: UiError, context: UiErrorContext = {}): string {
    if (context.fallbackMessage) return context.fallbackMessage;

    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Backend nicht erreichbar.';
      case ApiErrorCode.UNAUTHENTICATED:
        return 'Anmeldung erforderlich oder Sitzung abgelaufen.';
      case ApiErrorCode.FORBIDDEN:
        return 'Sie haben für diese Aktion keine Berechtigung.';
      case ApiErrorCode.ENTITY_LOCKED:
        return `${this.getEntityLabel(context.entity, 'Der Datensatz')} wird gerade durch eine andere Person bearbeitet.`;
      case ApiErrorCode.WORKFLOW_RUNNING:
        return 'Es läuft bereits eine Ausführung. Bitte warten Sie, bis der aktuelle Lauf beendet ist.';
      case ApiErrorCode.UNIQUE_CONSTRAINT:
        return this.getUniqueMessage(context);
      case ApiErrorCode.NOT_FOUND:
        return `${this.getEntityLabel(context.entity, 'Die angeforderte Ressource')} wurde nicht gefunden.`;
      case ApiErrorCode.VALIDATION_FAILED:
        return this.getValidationMessage(context);
      case ApiErrorCode.INVALID_REQUEST:
        return this.getInvalidRequestMessage(context);
      case ApiErrorCode.INTERNAL_ERROR:
      case 'UNKNOWN_ERROR':
      default:
        return error.correlationId
          ? `Unerwarteter Fehler. Referenz-ID: ${error.correlationId}`
          : 'Unerwarteter Fehler.';
    }
  }

  getDetailSummary(error: UiError, maxItems = 3): string[] {
    return error.details
      .map((detail) => this.formatDetail(detail.path, detail.message))
      .filter((detail, index, all) => detail.length > 0 && all.indexOf(detail) === index)
      .slice(0, maxItems);
  }

  private getUniqueMessage(context: UiErrorContext): string {
    if (context.action === 'create') {
      return `${this.getEntityLabel(context.entity, 'Der Datensatz')} existiert bereits mit diesen Angaben.`;
    }
    return `Fuer ${this.getEntityLabel(context.entity, 'den Datensatz')} existiert bereits ein Eintrag mit diesen Angaben.`;
  }

  private getValidationMessage(context: UiErrorContext): string {
    switch (context.action) {
      case 'create':
        return `${this.getEntityLabel(context.entity, 'Der Datensatz')} konnte nicht angelegt werden. Bitte korrigieren Sie die Eingaben.`;
      case 'update':
      case 'save':
        return `${this.getEntityLabel(context.entity, 'Der Datensatz')} konnte nicht gespeichert werden. Bitte korrigieren Sie die Eingaben.`;
      case 'run':
      case 'start':
        return 'Aktion konnte nicht gestartet werden. Bitte pruefen Sie die Eingaben.';
      default:
        return 'Bitte korrigieren Sie die Eingaben.';
    }
  }

  private getInvalidRequestMessage(context: UiErrorContext): string {
    switch (context.action) {
      case 'load':
        return `${this.getEntityLabel(context.entity, 'Die Daten')} konnten nicht geladen werden.`;
      case 'create':
        return `${this.getEntityLabel(context.entity, 'Der Datensatz')} konnte nicht angelegt werden.`;
      case 'delete':
        return `${this.getEntityLabel(context.entityPlural ?? context.entity, 'Die Daten')} konnten nicht gelöscht werden.`;
      case 'combine':
        return 'Die ausgewählten Datensätze konnten nicht zusammengeführt werden.';
      case 'run':
      case 'start':
        return 'Aktion konnte nicht gestartet werden.';
      case 'save':
      case 'update':
      default:
        return `${this.getEntityLabel(context.entity, 'Der Datensatz')} konnte nicht gespeichert werden.`;
    }
  }

  private formatDetail(path: string | undefined, message: string): string {
    if (!path) return message;
    return `${this.humanizePath(path)}: ${message}`;
  }

  private humanizePath(path: string): string {
    return path
      .split('.')
      .filter(Boolean)
      .join(' > ')
      .replace(/_/g, ' ');
  }

  private getEntityLabel(entity: string | undefined, fallback: string): string {
    if (!entity || entity.trim().length === 0) return fallback;
    return entity;
  }
}
