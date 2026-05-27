import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': join(__dirname, 'lib/asyncStorageShim.ts')
    };
    return config;
  }
};

export default nextConfig;
