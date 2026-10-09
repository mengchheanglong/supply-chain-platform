import { Module } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InventoryService, PgInventoryRepository, FacilityService, SkuService, Database, AuditService } from '@supply-chain/operations';
import { FacilityModule } from '../facilities/module';
import { SkuModule } from '../catalog/module';
import { InventoryController } from './controller';
@Module({imports:[FacilityModule,SkuModule],controllers:[InventoryController],providers:[{
  provide:InventoryService,useFactory:(db:Database,facilities:FacilityService,catalog:SkuService,audit:AuditService)=>
    new InventoryService(db,new PgInventoryRepository(),facilities,catalog,audit,{id:randomUUID,now:()=>new Date().toISOString()}),
  inject:[Database,FacilityService,SkuService,AuditService]
}],exports:[InventoryService]})
export class InventoryModule {}
