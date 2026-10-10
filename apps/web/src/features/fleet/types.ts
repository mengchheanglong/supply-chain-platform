export interface SandboxPosition {
  lat: number;
  lng?: number;
  lon?: number;
}

export interface SandboxVehicle {
  id: string;
  type: string;
  status: 'idle' | 'en_route' | 'returning' | 'broken_down' | 'charging' | string;
  driverId?: string;
  driverName?: string;
  battery?: number;
  speed_kmh?: number;
  position: SandboxPosition;
  assignedDepotId?: string;
  destinationFacilityId?: string;
  currentOrderCount?: number;
}

export interface SandboxSimState {
  status: 'running' | 'paused' | 'stopped' | string;
  simTime: number;
  clock: {
    speed: number;
    paused: boolean;
  };
}

export interface SandboxSimStats {
  totalDistanceKm: number;
  activeVehicles: number;
  completedDeliveries: number;
  pendingOrders: number;
  avgDeliveryDurationMinutes?: number;
}

export interface FleetSimulationData {
  state: SandboxSimState | null;
  stats: SandboxSimStats | null;
  vehicles: SandboxVehicle[];
  isAvailable: boolean;
  errorMessage?: string;
}
