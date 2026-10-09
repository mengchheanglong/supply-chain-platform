export interface Actor { tenantId: string; tenantName: string; timezone: string; actorId: string; role: 'operator' | 'reader'; correlationId?: string }
