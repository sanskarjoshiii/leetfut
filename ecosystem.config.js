// pm2 process definition for the LeetFut production server (Docker-free).
//   pm2 start ecosystem.config.js     # launch / relaunch
//   pm2 logs leetfut                  # tail logs
//   pm2 restart leetfut               # after a rebuild
//
// Runs the Next.js standalone server binary directly with node — on Windows
// `pm2 start npm -- start` fails because npm's .cmd wrapper isn't valid JS, so
// we point pm2 at next's own bin instead. Host/port bind all interfaces:3000.
module.exports = {
  apps: [
    {
      name: "leetfut",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 0.0.0.0 -p 3000",
      cwd: __dirname,
      interpreter: "node",
      autorestart: true,
      max_restarts: 10,
      env: { NODE_ENV: "production" },
    },
  ],
};
