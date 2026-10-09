import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Configuration } from '@supply-chain/operations';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { AppModule } from './app.module';
import { Errors } from './transport/http/errors';
import { HttpMetrics } from './transport/http/metrics';
export async function createApplication(config:Configuration) {
  const adapter = new FastifyAdapter({logger:false,bodyLimit:65536,requestTimeout:10000,genReqId:()=>randomUUID(),requestIdHeader:false});
  const metrics = new HttpMetrics(), starts = new WeakMap<object,number>();
  adapter.getInstance().addHook('onRequest',async(request,reply)=>{
    starts.set(request,performance.now());reply.header('Cache-Control','no-store');reply.header('X-Request-Id',request.id);
  });
  adapter.getInstance().addHook('onResponse',async(request,reply)=>{
    metrics.record(request.routeOptions.url ?? 'unmatched',reply.statusCode,starts.get(request) ?? performance.now());
  });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule.forRoot(config,metrics),adapter,{logger:false});
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
  app.useGlobalFilters(new Errors());app.enableShutdownHooks();
  return app;
}
