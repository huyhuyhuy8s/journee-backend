// jobs/tokenCleanup.js
import cron from "node-cron";
import { JWTService } from "@/services/jwt.service";

export const startTokenCleanupJob = () => {
  cron.schedule("0 2 * * *", async () => {
    console.log("🧹 Starting daily token cleanup...");
    try {
      const cleanedCount = await JWTService.cleanupExpiredTokens();
      console.log(`✅ Token cleanup completed: ${cleanedCount} tokens removed`);
    } catch (error) {
      console.error("❌ Token cleanup failed:", error);
    }
  });

  console.log("📅 Token cleanup job scheduled (daily at 2:00 AM)");
};
