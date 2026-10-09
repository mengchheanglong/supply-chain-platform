import { Module } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuditService, Database, FacilityService, PgFacilityRepository } from '@supply-chain/operations';
import { FacilityController } from './controller';
@Module({controllers:[FacilityController],providers:[{provide:FacilityService,
  useFactory:(db:Database,audit:AuditService)=>new FacilityService(db,new PgFacilityRepository(),audit,{id:randomUUID,now:()=>new Date().toISOString()}),
  inject:[Database,AuditService]}],exports:[FacilityService]})
export class FacilityModule {}
