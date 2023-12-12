# Publication Server

Steps to run this project:

1. Run `npm i` command to install all dependencies
2. Setup database settings inside `ormconfig.json` file (see below)
3. Run `npm start` command

{
   "type": "postgres",
   "host": "localhost",
   "port": 5432,
   "username": "user",
   "password": "password",
   "database": "db",
   "synchronize": true,
   "logging": false,
   "entities": [
      "src/entity/**/*.ts"
   ],
   "migrations": [
      "src/migration/**/*.ts"
   ],
   "subscribers": [
      "src/subscriber/**/*.ts"
   ],
   "cli": {
      "entitiesDir": "src/entity",
      "migrationsDir": "src/migration",
      "subscribersDir": "src/subscriber"
   }
}
