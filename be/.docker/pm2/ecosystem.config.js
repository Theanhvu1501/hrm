const services = [
  { name: 'gateway', port: 3000 },
  { name: 'auth-service', port: 3001 },
  { name: 'config-service', port: 3007 },
];

module.exports = {
  apps: services.map((svc) => ({
    name: svc.name,
    script: `dist/apps/${svc.name}/main.js`,
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    restart_delay: 3000,
    max_restarts: 10,
    env: {
      NODE_ENV: 'production',
      PORT: svc.port,
    },
    max_memory_restart: '256M',
    error_file: '/dev/stderr',
    out_file: '/dev/stdout',
    merge_logs: true,
    time: true,
  })),
};
