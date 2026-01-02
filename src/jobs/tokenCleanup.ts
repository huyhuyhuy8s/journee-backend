import cron from 'node-cron';
import {cleanupExpiredTokens} from '@/services/jwt.service';

export const startTokenCleanupJob = () => {
  cron.schedule('0 2 * * *', async () => {
    console.info('🧹 Starting daily token cleanup...');
    try {
      const cleanedCount = await cleanupExpiredTokens();
      console.info(`✅ Token cleanup completed: ${cleanedCount} tokens removed`);
    } catch (error) {
      console.error('❌ Token cleanup failed:', error);
    }
  });

  console.info('📅 Token cleanup job scheduled (daily at 2:00 AM)');
};
