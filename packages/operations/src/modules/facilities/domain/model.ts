export interface FacilityInput { code: string; name: string; sourceSystem: string; externalId: string; kind: 'warehouse' | 'depot'; timezone: string; latitude: number; longitude: number; locationSource: 'surveyed' | 'imported' | 'estimated'; }
export interface Facility extends FacilityInput { id: string; tenantId: string; createdAt: string }
export function validTimezone(timezone: string): boolean {
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format(); return true; } catch { return false; }
}
