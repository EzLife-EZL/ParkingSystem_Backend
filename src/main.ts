import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  dotenv.config();

  // Check if running in Render environment
  const isProduction = process.env.NODE_ENV === 'production';

  let serviceAccount;
  if (isProduction) {
  try {
    const serviceAccountPath = path.join(
      process.cwd(),
      'firebase-service-account.json'
    );
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  } catch (error) {
    console.error('Error loading Firebase service account on Render:', error);
    process.exit(1);
  }
} else {
  try {
    serviceAccount = require(path.join(__dirname, '..', 'firebase-service-account.json'));
  } catch (error) {
    console.error('Error loading Firebase service account locally:', error);
    process.exit(1);
  }
}


  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true
  }));

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`Server running on port ${port}`);
}
bootstrap();