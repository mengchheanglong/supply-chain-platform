export interface SkuInput { code: string; name: string; sourceSystem: string; externalId: string; unit: 'each' | 'kg' | 'm3' | 'litre'; quantityPrecision: number; }
export interface Sku extends SkuInput { id: string; tenantId: string; createdAt: string }
