import { Module } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Database, InventoryService, FacilityService, SkuService, AuditService, FulfillmentService, PgFulfillmentRepository } from '@supply-chain/operations';
import { InventoryModule } from '../inventory/module';
import { FacilityModule } from '../facilities/module';
import { SkuModule } from '../catalog/module';
import { FulfillmentController } from './controller';
@Module({imports:[InventoryModule,FacilityModule,SkuModule],controllers:[FulfillmentController],providers:[{
 provide:FulfillmentService,useFactory:(db:Database,inventory:InventoryService,facilities:FacilityService,catalog:SkuService,audit:AuditService)=>new FulfillmentService(db,new PgFulfillmentRepository(),inventory,facilities,catalog,audit,{id:randomUUID,now:()=>new Date().toISOString()}),inject:[Database,InventoryService,FacilityService,SkuService,AuditService]
}],exports:[FulfillmentService]})
export class FulfillmentModule {}
