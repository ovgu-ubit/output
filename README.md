# Output

Web application for managing and analyzing publications of universities.
General information can be found in the [Wiki](https://github.com/ovgu-ubit/output/wiki).

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Security Concept](#security)
4. [Updating](#updating)
5. [Workflow-Definition](https://github.com/ovgu-ubit/output/tree/main/output-ui/src/app/workflow)

## Installation <a name="installation"></a>
### Requirements
- Node.JS 22
- Installed Postgres DBMS with an existing given database with owner rights for the given user

### Workspace setup
This repository is managed as an npm workspace from the root directory. The workspace contains:

- `output-api`: NestJS backend
- `output-ui`: Angular frontend
- `output-interfaces`: shared TypeScript interfaces used by backend and frontend

Install dependencies from the repository root:

> $ npm install
>

The shared interfaces are a separate package and must be built before backend or frontend builds can consume them. The root scripts do this automatically.

Useful root-level commands:

> $ npm run build:interfaces
>
> $ npm run build:api
>
> $ npm run build:ui
>
> $ npm run build:ui:prod
>

For local development, use the root watch scripts. They build `output-interfaces` once, keep it running in watch mode, and start the selected application:

> $ npm run dev:api
>
> $ npm run dev:ui
>
> $ npm run dev
>

The workspace uses a nested npm install strategy. Keep application runtime dependencies in the package that uses them (`output-api` or `output-ui`) instead of adding them to the root package.

### Docker 
A simple way to set up the application is to user our docker image. Pull the image:

> $ docker pull ghcr.io/ovgu-ubit/output:latest
>

Create `env.$NODE_ENV` and `environment.json` from the given templates (see File Actions), put them into `$APPDATA`, and mount that directory as `/config`. The database may be initialized with

> $ docker run --rm --cap-drop=ALL --security-opt no-new-privileges -e NODE_ENV=$NODE_ENV -v "$APPDATA:/config:ro" --entrypoint /usr/src/app/deploy/init-entrypoint.sh output-app
> 

And for running the container (either via port mapping or base_href):

> docker run --cap-drop=ALL --security-opt no-new-privileges -p $OUTER_PORT:1080 -e NODE_ENV=$NODE_ENV -e BASE_HREF=/ -v "$APPDATA:/config:ro" ghcr.io/ovgu-ubit/output
> 
> docker run --cap-drop=ALL --security-opt no-new-privileges -e BASE_HREF=/$BASE_HREF -e NODE_ENV=$NODE_ENV -v "$APPDATA:/config:ro" ghcr.io/ovgu-ubit/output

The container expects `/config/environment.json` for the frontend runtime configuration and renders runtime files below `/tmp/output-runtime`. If you additionally run it with a read-only root filesystem, provide a writable `/tmp`, for example via tmpfs.


### File actions
- Copy `output-api/env.template` to `env.$NODE_ENV` and put your info in it
- For local builds, edit `output-ui/src/assets/environment.json` and put your info in it
- For Docker, place the frontend runtime config at `$APPDATA/environment.json`; the entrypoint copies it from `/config/environment.json` into the served runtime files

For some services, abstract superclasses are defined. These can be extended by user-specific services which have to be added to the corresponding module definition:
- `output-api/src/guards/authorization.service.ts` for handling authorization with one example implementation `token.authorization.service.ts` using JWT token
- `output-api/src/services/init.service.ts` to fill DB with initial values
- `output-api/src/services/import/abstract-import.ts` defining imports 
- `output-api/src/services/import/api-enrich-doi.service.ts` defining enrichs 
- `output-api/src/services/check/abstract-plausibility.service.ts` defining plausibility checks
- `output-api/src/services/export/abstract-export.service.ts` defining exports
- `output-ui/src/environments/environment.ts` => `environment.*.ts` creating own Angular environments for building
- `output-ui/src/styles.scss` can be edited to include custom SASS

### Init Database
The init service creates the DB schema and fills it with some basic master data such as open access categories. You may extend this service to initialize other master data of your institution.

Run this from the repository root:

> $ npm install
>
> $ npm run build:interfaces
>
> $ npm --workspace output run start:init
> 

### Demo database reset
When `DEMO_MODE=true`, the backend resets the demo database on startup before accepting HTTP requests and daily at 03:00 Europe/Berlin. Set `DEMO_RESET_SQL_PATH` to a data-only PostgreSQL dump that is mounted into the container, for example `/config/demo-reset.sql`.

Create the snapshot from a prepared demo database:

```bash
pg_dump --data-only --column-inserts --no-owner --no-privileges --exclude-table=public.migrations --file demo-reset.sql <demo-db>
```

The regular TypeORM migrations still manage the schema. The demo reset keeps the migrations table and restores only the demo data from the snapshot.
`pg_dump` may warn about circular foreign-key constraints on tables such as `institute`, `cost_center`, or `invoice`. This is expected for the current schema; the reset defers foreign-key checks while importing the snapshot.

### Run backend api locally
Run the backend from the repository root. This keeps `output-interfaces` in watch mode and starts the NestJS backend in watch mode:

> $ npm run dev:api
>

For a non-watch dev start, use:

> $ npm run start:api
> 
### Run backend productively
We recommend running the backend api on a Linux server using pm2, adapt `output-api/output-server-prod.config.js'  for this case and register it with pm2, running this command to update your application:
> $ npm install
> 
> $ npm run build:api

Before running the system the first time, use
> $ npm run build:interfaces
>
> $ npm --workspace output run start:init_{test|prod}
> 
> $ npm --workspace output run typeorm:dev migration:run -- -d ./src/config/app.data.source.ts --fake

The last line ensures that the migrations table is populated for future migrations.

Alternatively to pm2, you can also use `npm --workspace output run start:{test|prod}` after building the software.

### run frontend locally
Run the frontend from the repository root. This keeps `output-interfaces` in watch mode and starts the Angular dev server:

> $ npm run dev:ui
> 
To start both backend and frontend together, use:

> $ npm run dev

### build frontend distributables
Build frontend distributables from the repository root:

> $ npm run build:ui
>
> $ npm run build:ui:prod
>

The root build scripts build `output-interfaces` first. If you need to pass additional Angular options such as a custom `base-href`, run the Angular workspace script directly after building the interfaces:

> $ npm run build:interfaces
>
> $ npm --workspace output-ui run ng -- build --configuration {test|production} --base-href /output/

Copy these distributables to your web server and configure it for an angular web app. For apache2, the configuration file can look as follows:

>        <Directory /var/www/html/output>
>                Options FollowSymlinks
>                AllowOverride All
>                Require all granted
>                <IfModule mod_rewrite.c>
>                        RewriteEngine On
>                        RewriteBase /output/
>                        RewriteRule ^index\.html$ - [L]
>                        RewriteCond %{REQUEST_FILENAME} !-f
>                        RewriteCond %{REQUEST_FILENAME} !-d
>                        RewriteRule . index.html [L]
>                </IfModule>
>        </Directory>
>        <Location /output/api/>
>                <IfModule mod_proxy.c>
>                        ProxyPreserveHost       On
>                        ProxyPass               https://server.de/your-output-api/
>                        ProxyPassReverse        https://server.de/your-output-api/
>                </IfModule>
>        </Location>


## Configuration <a name="configuration"></a>
After the UI has been started, go with an admin role to Verwaltung/Konfiguration and adapt runtime configuration parameters to your needs.

## Security Concept <a name="security"></a>
Output itself does not provide built-in user or role management. Instead, it is designed to be integrated into existing authentication and authorization infrastructures (e.g., SSO, proxy authentication, JWT providers, etc.). Both the backend and the frontend include security-related checks, but the primary enforcement takes place in the backend. Since all protected information is served through the backend, security measures on the frontend are limited to routing and UI access control and are therefore not considered authoritative.

Authorization can be fully relaxed during development or controlled environments by switching the authentication mode in both the backend and frontend configuration. In this mode, all requests are automatically treated as authorized.

On a conceptual level, the application distinguishes five levels of access permissions. While certain endpoints are intentionally public, all protected operations are validated against one of the following roles:
| Role                      | Description                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| **0. Authenticated User** | May read all non-financial data but cannot modify any records.                                        |
| **1. Reader**             | Additionally allowed to access financial data and trigger exports.                                    |
| **2. Publication Writer** | Can additonally modify publication-related data, but not master data.                                             |
| **3. Writer**             | Can additonally modify master data and execute validation checks.                                                 |
| **4. Admin**              | Full access: may additonally initiate imports and enrichment processes, as well as modify configuration settings. |

These roles define the overall security boundaries within the system and determine which operations are permitted for a given authenticated request.

### Backend concept
Access control in the backend is implemented by combining NestJS guards with endpoint-level permission declarations. Most controller methods are decorated with `@UseGuards(AccessGuard)` together with a `@Permissions(...)` decorator, which jointly determine whether an endpoint is protected and which roles are required to access it. Each element of a `@Permissions` declaration is of the form `{ role, app }`, where app is always `"output"` and role corresponds to one of the defined role levels described in the security concept.

The `AccessGuard` delegates the actual permission checks to an `AuthorizationService`, which is provided through the environment configuration. The abstract `AuthorizationService` class documents the expected behavior and illustrates how permissions should be extracted and validated:

* If no permission array is present on the endpoint, the endpoint is public.
* If the permission array is present but empty, a valid authenticated user is required, but no specific roles are needed.
* If the permission array contains one or more permission entries, the authenticated user must have at least one of them to be granted access.

Upon successful authorization, the request object is enriched with a user descriptor that indicates the effective role capabilities of the requester:
`{ read: boolean, write_publication: boolean, write: boolean, admin: boolean }`

A concrete reference implementation, `TokenAuthorizationService`, is included. It is based on JSON Web Tokens (JWT):

* It expects that the client provides a cookie named `auth-token` when making requests. This cookie is HTTP-only and therefore not accessible from frontend scripts.
* The contained JWT is verified using the public key of the issuing authentication service (URL configured via the `AUTH_API` environment variable).
* The JWT payload must include a permissions array containing elements of the form `{ appname, rolename }`, which are mapped to the internal permission evaluation described above.

### Frontend concept
Access control on the frontend is primarily handled through route guarding and a pluggable authorization service. Each route can define an access policy via the `data.roles` property, which specifies which roles are allowed to access that route. The `LoginGuard` evaluates this configuration and determines access rights using the currently active `AuthorizationService` (as configured through the environment).

The following conventions apply:

* If no `roles` array is defined, the route is always accessible.
* If an empty `roles` array is defined, the user must be authenticated (`isValid()` must return `true`).
* If specific roles are defined, the user must possess at least one of them, as determined by `hasRole(rolename)`.

Within components, the same `AuthorizationService` is used to control UI behavior — for example, enabling or disabling buttons depending on user permissions.

The abstract `AuthorizationService` class defines the required interface for any custom implementation:

* `isValid()` – returns whether a user is authenticated (otherwise the login button is shown).
* `getUser()` – returns the display name of the user (shown instead of the login button).
* `getPermissions()` – returns the user’s permissions in the form `{ rolename, appname }` (where appname should always be `"output"`).
* `hasRole(rolename)` – checks whether the user holds the given role within Output.
* `login(RouterStateSnapshot)` – invoked when an unauthenticated user clicks “Login”; receives the current route for redirection after successful authentication.
* `logout()` – invoked when an authenticated user clicks “Logout”.
* `details()` – invoked when an authenticated user opens the account details view.

A reference implementation, `CookieTokenService`, is provided for JWT-based authentication. It mirrors the backend’s logic, but with less strict validation, as frontend checks are inherently non-authoritative.

* It assumes that a decrypted version of the JWT payload is stored in a JavaScript-accessible cookie named `auth-details`.
* `isValid()` returns `true` if this cookie exists.
* `getUser()` and `getPermissions()` extract and interpret the data from that cookie.
* User authentication and JWT creation are delegated to an external Auth Service, which itself consists of two components:
   * auth-api – responsible for verifying credentials, issuing, and invalidating JWTs.
   * auth-ui – provides the login interface.
* When `login()` is called, users are redirected to auth-ui. After successful authentication and JWT cookie creation, they are redirected back to Output using the `redirectURL`.
* When `logout()` is called, users are directed to auth-api’s logout endpoint, which invalidates or deletes the cookie.
* When `details()` is called, users are redirected to auth-ui, for example to review their permissions or change their password, again with a `redirectURL` back to Output.

In the simplest case, the authentication service consists of a username/password form (auth-ui) and a backend (auth-api) that validates users against a database, assigns permissions, and issues the JWT cookie.

At Otto-von-Guericke University Magdeburg, authentication is handled through Shibboleth (SAML2-based SSO), while authorization (permission management) is provided by the separate auth service described above.

## Updating <a name="updating"></a>
1. Fetch new codebase from GitHub
2. Update dependencies from the repository root with

> $ npm install
   
3. Build and deploy frontend distributables like in installation:

> $ npm run build:ui:prod

4. Build backend and run pending migrations for DB schema:

> $ npm run build:api

> $ npm --workspace output run typeorm:dev migration:run -- -d ./src/config/app.data.source.ts












