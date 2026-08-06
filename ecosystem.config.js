export default {
  apps: [
    {
      name: 'ydotbot',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      // Auto-restart on crash or uncaught exception
      autorestart: true,
      max_memory_restart: '500M',
      // Log files
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Graceful shutdown
      listen_timeout: 3000,
      kill_timeout: 5000,
    },
  ],
};
