// pm2 start ecosystem.config.js --env production
module.exports = {
  apps: [
    {
      name: "Next",
      cwd: ".",
      script: "npm",
      args: "start",
      env_production: {
        NODE_ENV: "production",
      },
      env_development: {
        NODE_ENV: "development",
      },
    },
  ],
};
