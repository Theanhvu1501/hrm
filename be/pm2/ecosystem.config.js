module.exports = {
  apps: [
    {
      name: 'gateway',
      script: 'dist/apps/gateway/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '256M',
      error_file: '/dev/stderr',
      out_file: '/dev/stdout',
      merge_logs: true,
      time: true,
    },
    {
      name: 'auth-service',
      script: 'dist/apps/auth-service/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      max_memory_restart: '256M',
      error_file: '/dev/stderr',
      out_file: '/dev/stdout',
      merge_logs: true,
      time: true,
    },
    {
      name: 'config-service',
      script: 'dist/apps/config-service/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3007,
      },
      max_memory_restart: '256M',
      error_file: '/dev/stderr',
      out_file: '/dev/stdout',
      merge_logs: true,
      time: true,
    },
  ],
};
