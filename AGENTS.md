# AGENTS

## 1. Projektüberblick

- Name: Output
- Zweck: Verwaltung von Publikationen, Publikationsverträgen und -kosten
- Hauptkomponenten:
  - `output-api`: NestJS-Backend mit TypeORM, steuert PostgreSQL außerhalb des Projekts
  - `output-ui`: Angular-Frontend.
  - `output-interfaces`: Gemeinsame Interfaces für Front- und Backend

## 2. Tech-Stack und wichtige Pfade

- Basis: Node.JS 22 und NPM

- Backend:
  - Framework: NestJS
  - ORM: TypeORM
  - Entry Point: `output-api/src/main.ts` 
  - Konfiguration: `output-api/src/config/...`

- Frontend:
  - Framework: Angular
  - Entry Point: `output-ui/src/main.ts` und `output-ui/src/index.html`
  - Routing: `output-ui/src/app/app-routing.module.ts`

- Tests:
  - Unit Tests: Jest, Dateien `*.spec.ts`
  - Ordner `e2e/`

- Starten:
  - Lokal: `npm run start:dev` (API) / `npm run start` (UI)

## 3. Aufgaben, bei denen du helfen sollst

Du (Agent) darfst insbesondere:

- Code analysieren und erklären.
- Neue Features implementieren, wenn klar beschrieben.
- Tests hinzufügen oder erweitern.
- Repetitive Änderungen im ganzen Repo vornehmen (Refactoring, Rename, Typanpassungen).
- CI-Workflows in `.github/workflows` anpassen oder ergänzen.
- TypeORM-Migrationen erstellen, wenn Datenmodell geändert wird.

Typische Aufgabenbeispiele:

1. **Modell-Erweiterung**
   - Wenn ein Entity-Feld hinzugefügt wird:
     - Entity anpassen (`*.entity.ts`)
     - DTOs anpassen (`*.dto.ts`)
     - Validation aktualisieren
     - Migration hinzufügen
     - Relevante Services/Controller anpassen
     - UI-Formulare und API-Calls anpassen
     - Testspecs anpassen

2. **Neue API-Route**
   - Controller, Service, DTO, Tests anlegen.
   - Route in Swagger/OpenAPI dokumentieren, falls relevant.

## 4. Dinge, die du NICHT tun sollst

- Keine echten Credentials in Dateien schreiben.
- Keine destructive DB-Änderungen ohne Migration (z.B. Tabellen oder Spalten einfach droppen).
- Keine History rewriting (Git) – nur neue Commits.

## 5. Projektkonventionen

- Code-Stil:
  - TypeScript strict mode.
  - ESLint/Prettier-Konfiguration beachten (`output-api/eslint.config.mts`).
  - As simple as possible

- Architektur:
  - Domain-Module benutzen anstatt „God-Services“.
  - Gemeinsame Logik in `shared/` oder `common/` ablegen.
  - Kein direkter Zugriff von Controllern auf Repositories – immer über Services.

- Tests:
  - Für neue Features: Unit-Tests hinzufügen.
  - Bestehende Testmuster wiederverwenden.
  - Alle Tests sollen per `npm test` bzw. `npm run test:e2e` laufen.

## 6. Beispiel-Prompts für Agenten

Nutze folgende Beispiele als Vorlage, wie du Aufgaben interpretieren sollst:

- „Füge dem `Contract`-Entity ein Feld `oa_category` hinzu und zieh das konsistent durch (Entity, Migration, DTO, UI).“
- „Schreibe Unit-Tests für `AuthorizationService` analog zu den bestehenden Tests in `authorization.service.spec.ts`.“
- „Passe den GitHub Actions Workflow `build-and-test.yml` an, sodass bei jedem Pull Request Backend- und Frontend-Tests laufen.“

## 7. Besondere Hinweise

- Laufzeit-Konfiguration:
  - Für lokale Entwicklung `.env.dev` verwenden (nicht committen).

- Migrationen:
  - Neue Migrationen in `apps/output-api/src/migrations` ablegen.
  - Naming-Konvention: `TIMESTAMP-meaningful-name.ts`.

