import { Module } from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import { Database, InventoryService, FacilityService, SkuService, AuditService, ExchangeService, PgExchangeRepository } from '@supply-chain/operations';
import { InventoryModule } from '../inventory/module';
import { FacilityModule } from '../facilities/module';
import { SkuModule } from '../catalog/module';
import { ExchangeController } from './controller';
@Module({imports:[InventoryModule,FacilityModule,SkuModule],controllers:[ExchangeController],providers:[{
 provide:ExchangeService,useFactory:(db:Database,facilities:FacilityService,catalog:SkuService,inventory:InventoryService,audit:AuditService)=>new ExchangeService(db,new PgExchangeRepository(),facilities,catalog,inventory,audit,{id:randomUUID,now:()=>new Date().toISOString()},{sha256:value=>createHash('sha256').update(value,'utf8').digest('hex')}),inject:[Database,FacilityService,SkuService,InventoryService,AuditService]
}]})
export class ExchangeModule {}
