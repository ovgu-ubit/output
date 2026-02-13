module.exports = {
  apps : [{
    name: 'output',
    script: 'npm run start:test',
    watch: '.',
    ignore_watch : ["node_modules", "*.log"],
  }]
};
