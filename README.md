# Output

Web application for managing and analyzing publications of universities

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Security Concept](#security)
4. [Updating](#updating)

## Installation <a name="installation"></a>
### Requirements
- Node.JS 22
- Installed DBMS such as Postgres with an existing given database with owner rights for the given user

### File actions
Copy the following files from their templates and put your info in it:
- `output-api/env.template` => `env.{dev|test|prod}` for DB, App and SSL configuration as well as secrets
- `output-ui/src/environments/environment.ts.template` => `environment.{ts|test.ts|prod.ts}`
- `output-ui/src/styles.scss.template` => `styles.scss`

For some services, abstract superclasses are defined. These can be extended by user-specific services which have to be added to the corresponding module definition:
- `output-api/src/guards/authorization.service.ts` for handling authorization with one example implementation `token.authorization.service.ts` using JWT token
- `output-api/src/services/init.service.ts` to fill DB with initial values
- `output-api/src/services/import/abstract-import.ts` defining imports 
- `output-api/src/services/import/api-enrich-doi.service.ts` defining enrichs 
- `output-api/src/services/check/abstract-plausibility.service.ts` defining plausibility checks
- `output-api/src/services/export/abstract-export.service.ts` defining exports

### Run backend api locally
> $ npm run i
> 
> $ npm run start:dev
> 
### Run backend productively
We recommend running the backend api on a Linux server using pm2, adapt output-api/output-server-prod.config.js for this case and register it with pm2, running this command to update your application:
> $ npm run i
>
> $ npm run build

Alternatively, you can also use `npm run start:{test|prod}` after building the software.

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

## Updating <a name="updating"></a>
1. Fetch new codebase from GitHub
2. Build and deploy frontend distributables like in installation
3. Build backend and run pending migrations for DB schema:

> npm run typeorm:dev migration:run -- -d ./src/config/app.data.source.ts



