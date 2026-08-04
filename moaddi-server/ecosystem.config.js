// pm2 start ecosystem.config.js --env production
// tsx is required: the app loads .ts modules (e.g. app/lib/ability.ts).
module.exports = {
  apps: [
    {
      name: "Server",
      script: "index.js",
      interpreter: "node",
      interpreter_args: "--import tsx",
      watch: false,
      ignore_watch: [
        "node_modules",
        "images",
        "public",
        // private chat media — without this every upload restarts the server
        "chat-uploads",
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
