export type ServiceHealthStatus = 'healthy' | 'degraded' | 'unavailable' | 'unknown';

export interface ServiceNodeInfo {
  id: string;
  name: string;
  role: string;
  port: number | string;
  protocol: string;
  status: ServiceHealthStatus;
  latencyMs?: number;
  endpoint: string;
  version?: string;
  details?: Record<string, string | number | boolean>;
  message?: string;
}

export interface SystemHealthMatrixData {
  timestamp: string;
  services: ServiceNodeInfo[];
  overallStatus: ServiceHealthStatus;
  partitionTolerant: boolean;
  ledgerReconciled: boolean;
  isolationEnforced: boolean;
}
