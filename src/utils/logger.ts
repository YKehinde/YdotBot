const timestamp = () => new Date().toISOString();

export const logger = {
  info: (label: string, message: string) => {
    console.log(`[${timestamp()}] [INFO] [${label}] ${message}`);
  },
  error: (label: string, message: string, error?: unknown) => {
    console.error(`[${timestamp()}] [ERROR] [${label}] ${message}`, error || '');
  },
  warn: (label: string, message: string, error?: unknown) => {
    console.warn(`[${timestamp()}] [WARN] [${label}] ${message}`, error || '');
  },
  debug: (label: string, message: string) => {
    console.log(`[${timestamp()}] [DEBUG] [${label}] ${message}`);
  },
};
