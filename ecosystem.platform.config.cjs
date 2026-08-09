module.exports = {
  apps: [
    {
      name: "platform-api",
      cwd: "/home/ubuntu/deltcrm-platform",
      script: "./scripts/pm2-run-platform-api.sh",
      interpreter: "/bin/bash",
      env: {
        NODE_ENV: "production",
        PLATFORM_API_PORT: "4011",
      },
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
      env: {
        NODE_ENV: "production",
        PLATFORM_WEB_PORT: "4021",
      },
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
