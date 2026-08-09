module.exports = {
  apps: [
    {
      name: "platform-api",
      cwd: "/home/ubuntu/deltcrm-platform",
      script: "./scripts/pm2-run-platform-api.sh",
      interpreter: "/bin/bash",
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: "platform-web",
      cwd: "/home/ubuntu/deltcrm-platform",
      script: "./scripts/pm2-run-platform-web.sh",
      interpreter: "/bin/bash",
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
