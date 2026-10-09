import { ExchangeModule } from './modules/integrations/module';
import { FulfillmentModule } from './modules/fulfillment/module';
import { ShippingModule } from './modules/shipping/module';
import { InventoryModule } from './modules/inventory/module';
import { DynamicModule, Module } from '@nestjs/common';
import type { Configuration } from '@supply-chain/operations';
import { PlatformModule } from './platform.module';
import { FacilityModule } from './modules/facilities/module';
import { SkuModule } from './modules/catalog/module';
import { IdentityModule } from './modules/identity/module';
import { HealthController } from './health/controller';
import { HttpMetrics } from './transport/http/metrics';
@Module({})
export class AppModule {
  static forRoot(config:Configuration,metrics:HttpMetrics):DynamicModule {
    return {module:AppModule,imports:[PlatformModule.forRoot(config),IdentityModule,FacilityModule,SkuModule,InventoryModule,FulfillmentModule,ShippingModule,ExchangeModule],controllers:[HealthController],providers:[{provide:HttpMetrics,useValue:metrics}]};
  }
}
