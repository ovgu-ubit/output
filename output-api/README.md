# Publication Server

Steps to run this project:

1. Run `npm run i` and `npm run audit fix` command to install all dependencies
2. Ensure that environment and app configuration are available (env.(dev|test|prod) and config.ts) using provided templates
3. Run `npm run start:(dev|test|prod)` command to test if server is working
4. We recommend using pm2 to run Node.JS servers in production settings
   1. Run `npm run build`
   2. Load the available configuration (output-server-test.config.js) into pm2 and save 

