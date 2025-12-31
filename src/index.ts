import 'module-alias/register';
import express, {type Application, type Request, type Response} from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import openapiDocument from '@@/openapi.json';
import {cleanupOldLogs, errorLogger, requestLogger} from '@/middlewares/logger';
import {startTokenCleanupJob} from '@/jobs/tokenCleanup';
import userRoutes from '@/routes/user';
import postRoutes from '@/routes/post';
import journalRoutes from '@/routes/journal';
import locationRoutes from '@/routes/location';
import {config, isProduction} from '@/config/env';
import {responseFormatter} from '@/middlewares/responseFormatter';
import API_ROUTES from '@/config/routes';

const app: Application = express();

app.use(cors(config.CORS_OPTIONS));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({extended: true}));

app.use(responseFormatter);
app.use(requestLogger);

app.use(API_ROUTES.DOCS, swaggerUi.serve, swaggerUi.setup(openapiDocument));
app.use(API_ROUTES.USERS, userRoutes);
app.use(API_ROUTES.POSTS, postRoutes);
app.use(API_ROUTES.JOURNALS, journalRoutes);
app.use(API_ROUTES.LOCATIONS, locationRoutes);

app.get(API_ROUTES.HEALTH, (_: Request, res: Response) => {
  return res.json({
    status: 'OK',
    time: new Date().toISOString(),
    environment: config.NODE_ENV || 'development',
  });
});

app.get('/', (_: Request, res: Response) => {
  return res.json({
    message: 'Journee API Server',
    version: '0.5.0',
    status: 'Running',
  });
});

app.use(errorLogger);

app.use((err: Error, _: Request, res: Response) => {
  console.error(err.stack);
  return res.status(500).json({error: 'Something went wrong!'});
});

app.use((_: Request, res: Response) => {
  return res.status(404).json({error: 'Route not found'});
});

if (isProduction) {
  cleanupOldLogs(30);
  startTokenCleanupJob();

  setInterval(() => {
    cleanupOldLogs(30);
  }, 24 * 60 * 60 * 1000);
}

app.listen(config.PORT, () => {
  console.info(`🚀 Server is running on port ${config.PORT}`);
  console.info('📁 Logs will be stored in ./logs directory');
  console.info(`🔧 Environment: ${config.NODE_ENV}`);
  console.info(
    `⚡ Journee API Server started successfully at ${new Date().toISOString()}`,
  );
});
