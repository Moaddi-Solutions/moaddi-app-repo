// pm2 start ecosystem.config.js --env production
module.exports = {
  apps: [
    {
      name: "Server",
      script: "index.js",
      watch: ".",
      ignore_watch: [
        "node_modules",
        "images",
        "public",
        "db.json",
        "app/services/test",
      ],
      env_production: {
        NODE_ENV: "production",
      },
      env_development: {
        NODE_ENV: "development",
      },
    },
  ],
};
