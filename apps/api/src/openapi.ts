import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';
export function apiDocument(app:INestApplication) {
  return SwaggerModule.createDocument(app,new DocumentBuilder().setTitle('Supply Chain Operations API').setVersion('1.0').addBearerAuth().build());
}
