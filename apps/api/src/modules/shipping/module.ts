import { Module } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Database, AuditService, FulfillmentService, ShippingService, PgShippingRepository } from '@supply-chain/operations';
import { FulfillmentModule } from '../fulfillment/module';
import { ShippingController } from './controller';
@Module({imports:[FulfillmentModule],controllers:[ShippingController],providers:[{
 provide:ShippingService,useFactory:(db:Database,fulfillment:FulfillmentService,audit:AuditService)=>new ShippingService(db,new PgShippingRepository(),fulfillment,audit,{id:randomUUID,now:()=>new Date().toISOString()}),inject:[Database,FulfillmentService,AuditService]
}]})
export class ShippingModule {}
