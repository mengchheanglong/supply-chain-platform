import { Module } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuditService, Database, SkuService, PgSkuRepository } from '@supply-chain/operations';
import { SkuController } from './controller';
@Module({controllers:[SkuController],providers:[{provide:SkuService,
  useFactory:(db:Database,audit:AuditService)=>new SkuService(db,new PgSkuRepository(),audit,{id:randomUUID,now:()=>new Date().toISOString()}),
  inject:[Database,AuditService]}],exports:[SkuService]})
export class SkuModule {}
