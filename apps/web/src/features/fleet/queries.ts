import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  FleetSimulationData,
  SandboxSimState,
  SandboxSimStats,
  SandboxVehicle,
} from './types';

const SANDBOX_ORIGIN = ((import.meta as any).env?.VITE_SANDBOX_ORIGIN as string) || 'http://127.0.0.1:3001';


export async function fetchFleetSimulation(): Promise<FleetSimulationData> {
  try {
    const [stateRes, vehiclesRes] = await Promise.all([
      fetch(`${SANDBOX_ORIGIN}/api/simulation/state`, {
        signal: AbortSignal.timeout(3000),
        headers: { Accept: 'application/json' },
      }).catch(() => null),
      fetch(`${SANDBOX_ORIGIN}/api/vehicles`, {
        signal: AbortSignal.timeout(3000),
        headers: { Accept: 'application/json' },
      }).catch(() => null),
    ]);

    if (!stateRes || !stateRes.ok) {
      return {
        state: null,
        stats: null,
        vehicles: [],
        isAvailable: false,
        errorMessage: 'Logistics Sandbox is offline or unreachable on port 3001.',
      };
    }

    const stateJson = (await stateRes.json().catch(() => null)) as any;
    const vehiclesJson = vehiclesRes && vehiclesRes.ok ? ((await vehiclesRes.json().catch(() => [])) as SandboxVehicle[]) : [];

    const simState: SandboxSimState = {
      status: stateJson?.status ?? 'stopped',
      simTime: stateJson?.simTime ?? 0,
      clock: {
        speed: stateJson?.clock?.speed ?? 1,
        paused: Boolean(stateJson?.clock?.paused),
      },
    };

    const simStats: SandboxSimStats = {
      totalDistanceKm: stateJson?.stats?.totalDistanceKm ?? 0,
      activeVehicles: stateJson?.stats?.activeVehicles ?? vehiclesJson.filter((v) => v.status === 'en_route').length,
      completedDeliveries: stateJson?.stats?.completedDeliveries ?? 0,
      pendingOrders: stateJson?.stats?.pendingOrders ?? 0,
      avgDeliveryDurationMinutes: stateJson?.stats?.avgDeliveryDurationMinutes,
    };

    return {
      state: simState,
      stats: simStats,
      vehicles: vehiclesJson,
      isAvailable: true,
    };
  } catch (err: any) {
    return {
      state: null,
      stats: null,
      vehicles: [],
      isAvailable: false,
      errorMessage: err?.message || 'Error communicating with logistics sandbox.',
    };
  }
}

export function useFleetSimulation(refetchInterval = 4000) {
  return useQuery({
    queryKey: ['fleet-simulation'],
    queryFn: fetchFleetSimulation,
    refetchInterval,
  });
}

export function useSimulationControls() {
  const queryClient = useQueryClient();

  const togglePause = useMutation({
    mutationFn: async (shouldPause: boolean) => {
      const endpoint = shouldPause ? '/api/simulation/pause' : '/api/simulation/resume';
      const res = await fetch(`${SANDBOX_ORIGIN}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) throw new Error(`Simulation control failed: HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fleet-simulation'] });
    },
  });

  const setSpeed = useMutation({
    mutationFn: async (speed: number) => {
      const res = await fetch(`${SANDBOX_ORIGIN}/api/simulation/speed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speed }),
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) throw new Error(`Speed update failed: HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fleet-simulation'] });
    },
  });

  return {
    togglePause,
    setSpeed,
  };
}
