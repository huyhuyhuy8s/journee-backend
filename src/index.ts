import "module-alias/register";
import express, { Application, Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import cors, { CorsOptions } from "cors";
import swaggerUi from "swagger-ui-express";
import openapiDocument from "@@/openapi.json";

import {
  requestLogger,
  errorLogger,
  cleanupOldLogs,
} from "@/middlewares/logger";
import { startTokenCleanupJob } from "@/jobs/tokenCleanup";
import userRoutes from "@/routes/user";
import postRoutes from "@/routes/post";
import journalRoutes from "@/routes/journal";
import locationRoutes from "@/routes/location";
import { config } from "@/config/env";
import { responseFormatter } from "@/middlewares/responseFormatter";

const app: Application = express();

const corsOptions = config.CORS_ORIGIN;

app.use(cors(corsOptions));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(responseFormatter);

app.use(requestLogger);

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));

app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/journals", journalRoutes);
app.use("/api/location", locationRoutes);

app.get("/health", (req: Request, res: Response) => {
  return res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV || "development",
  });
});

app.get("/", (req: Request, res: Response) => {
  return res.json({
    message: "Journee API Server",
    version: "0.5.0",
    status: "Running",
  });
});

app.use(errorLogger);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  return res.status(500).json({ error: "Something went wrong!" });
});

// 404 handler
app.use((req: Request, res: Response) => {
  return res.status(404).json({ error: "Route not found" });
});

const PORT = config.PORT;
const NODE_ENV = config.NODE_ENV;

if (NODE_ENV === "production") {
  cleanupOldLogs(30); // Keep logs for 30 days
  startTokenCleanupJob();

  // Schedule daily cleanup
  setInterval(() => {
    cleanupOldLogs(30);
  }, 24 * 60 * 60 * 1000); // Run every 24 hours
}

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📁 Logs will be stored in ./logs directory`);
  console.log(`🔧 Environment: ${NODE_ENV}`);
  console.log(
    `⚡ Journee API Server started successfully at ${new Date().toISOString()}`
  );
});

export default app;
