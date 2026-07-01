module.exports = {
  apps: [
    {
      name: "paibanmao-saas",
      script: "node_modules/next/dist/bin/next",
      args: "start --hostname 127.0.0.1 --port 3001",
      cwd: __dirname,
      interpreter: "/opt/node-v22.13.1-linux-x64/bin/node",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        SITE_ADMIN_EMAIL: "guan113@126.com",
        PATH: "/opt/node-v22.13.1-linux-x64/bin:" + process.env.PATH,
      },
      max_memory_restart: "768M",
      time: true,
      out_file: "./logs/pm2-out.log",
      error_file: "./logs/pm2-error.log",
    },
  ],
};
