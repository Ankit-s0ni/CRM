module.exports = {
  apps: [
    {
      name: "deltcrm-api",
      cwd: "/home/ubuntu/CRM",
      script: "./scripts/pm2-run-api.sh",
      interpreter: "/bin/bash",
      env: {
        NODE_ENV: "production",
        PORT: "4001",
      },
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: "deltcrm-web",
      cwd: "/home/ubuntu/CRM",
      script: "./scripts/pm2-run-web.sh",
      interpreter: "/bin/bash",
      env: {
        NODE_ENV: "production",
        PORT: "4002",
      },
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
