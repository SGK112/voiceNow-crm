import { createClient } from 'redis';

let redisClient = null;

export const connectRedis = async () => {
  try {
    // Parse Redis URL or use config object for Redis Cloud
    let redisConfig;

    if (process.env.REDIS_URL) {
      // Try URL format first
      try {
        redisConfig = { url: process.env.REDIS_URL };
      } catch (urlError) {
        // Fallback to manual config if URL parsing fails
        const host = process.env.REDIS_HOST || 'localhost';
        const port = process.env.REDIS_PORT || 6379;
        const password = process.env.REDIS_PASSWORD;

        redisConfig = {
          socket: {
            host,
            port: parseInt(port),
            tls: host.includes('redis-cloud.com') || host.includes('redislabs.com')
          }
        };

        if (password) {
          redisConfig.password = password;
        }
      }
    } else {
      redisConfig = { url: 'redis://localhost:6379' };
    }

    redisClient = createClient(redisConfig);

    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    redisClient.on('connect', () => console.log('✅ Redis Connected'));

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('Redis connection error:', error);
    console.error('Please check your REDIS_URL or REDIS_HOST/PORT/PASSWORD configuration');
    return null;
  }
};

export const getRedisClient = () => redisClient;

export default { connectRedis, getRedisClient };
