# Output

Web application for managing and analyzing publications of universities.
General information can be found in the [Wiki](https://github.com/ovgu-ubit/output/wiki).

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Security Concept](#security)
4. [Updating](#updating)

## Installation <a name="installation"></a>
### Requirements
- Node.JS 22
- Installed Postgres DBMS with an existing given database with owner rights for the given user

### Docker 
A simple way to set up the application is to user our docker image. Pull the image:

> $ docker pull ghcr.io/ovgu-ubit/output:latest
>

Create `env.$NODE_ENV` and `environment.json` from the given templates (see File Actions) and link them into the container. The database may be initialized with

> $ docker run --rm -e NODE_ENV=$NODE_ENV -e CONFIG_DIR=/config -v "$APPDATA:/config:ro" -v "$APPDATA/environment.json:/var/www/html/assets/environment.json" --entrypoint /init-entrypoint.sh output-app
> 

And for running the container:

> docker run -p $OUTER_PORT:1080 --rm -e NODE_ENV=$NODE_ENV -e CONFIG_DIR=/config -v "$APPDATA:/config:ro" -v "$APPDATA/environment.json:/var/www/html/assets/environment.json" output-app
> 


### File actions
- Copy `output-api/env.template` to `env.$NODE_ENV` and put your info in it
- Edit `output-ui/src/assets/environment.json` and put your info in it

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

> $ npm run i
>
> $ npm run start:init
> 

### Run backend api locally
> $ npm run start:dev
> 
### Run backend productively
We recommend running the backend api on a Linux server using pm2, adapt `output-api/output-server-prod.config.js'  for this case and register it with pm2, running this command to update your application:
> $ npm run i
> 
> $ npm run build

Before running the system the first time, use
> $ npm run start:init_{test|prod}
>

Alternatively to pm2, you can also use `npm run start:{test|prod}` after building the software.

### run frontend locally
> $ npm i
> 
> $ npm start

### build frontend distributables
> $ ng build --configuration {test|production} --base-href /output/

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
2. Update dependencies in both output-api/ and output-ui/ with

> $ npm i --force
   
3. Build and deploy frontend distributables like in installation
4. Build backend and run pending migrations for DB schema:

> $ npm run typeorm:dev migration:run -- -d ./src/config/app.data.source.ts










