# Output

Web application for managing and analyzing publications of universities

## Installation
### Requirements
- Node.JS 20
- Installed DBMS such as Postgres with an existing given database with owner rights for the given user

### File actions
Copy the following files from their templates and put your info in it:
- output-api/config.ts.template => config.ts
- output-api/env.template => env.{dev|test|prod}
- output-ui/src/environments/environment.ts.template => environment.{ts|test.ts|prod.ts}
- output-ui/src/styles.scss.template => styles.scss 

For some services, extension points are defined where you can inject your custom logic (using config.ts):
- output-api/src/guards/authorization.service.ts for handling authorization with one example implementation token.authorization.service.ts using JWT token
- output-api/src/services/init.service.ts to fill DB with initial values
- output-api/src/services/import/abstract-import.ts defining imports 
- output-api/src/services/import/api-enrich-doi.service.ts defining enrichs 
- output-api/src/services/check/abstract-plausibility.service.ts defining plausibility checks
- output-api/src/services/export/abstract-export.service.ts defining exports

### Run backend api locally
> $ npm run i
> 
> $ npm run start:dev
> 
### Run backend productively
We recommend running the backend api on a Linux server using pm2, adapt output-api/output-server-prod.config.js for this case and register it with pm2, running this command to update your application:
> $ nest build

### run frontend locally
> $ npm i
> 
> $ npm start

### build frontend distributables
> $ ng build --configuration {test|production} --base-href /output/
