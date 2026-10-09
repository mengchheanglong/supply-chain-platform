export * from './domain/model';
export { ShippingService } from './application/service';
export type { ShippingRepository } from './application/service';
export { PgShippingRepository, shippingResource } from './infrastructure/repository';
