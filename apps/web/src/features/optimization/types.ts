export interface Coordinate {
  lat: number;
  lon: number;
}

export interface Depot {
  id: string;
  name: string;
  coordinate: Coordinate;
  openTimeS: number;
  closeTimeS: number;
}

export interface Vehicle {
  id: string;
  name: string;
  capacityUnits: number;
  maxShiftDurationS: number;
  startDepotId: string;
  endDepotId: string;
  fixedCostCents: number;
  costPerKmCents: number;
  costPerHourCents: number;
}

export interface ShipmentStop {
  id: string;
  orderId: string;
  coordinate: Coordinate;
  demandUnits: number;
  earliestArrivalS: number;
  latestArrivalS: number;
  serviceDurationS: number;
}

export interface ProblemDefinition {
  id: string;
  name: string;
  tenantId: string;
  depots: Depot[];
  vehicles: Vehicle[];
  stops: ShipmentStop[];
}

export interface StopVisit {
  stopId: string;
  coordinate: Coordinate;
  demandUnits: number;
  arrivalTimeS: number;
  serviceStartTimeS: number;
  departureTimeS: number;
  waitingTimeS: number;
  cumulativeLoadUnits: number;
  distanceFromPreviousM: number;
  travelTimeFromPreviousS: number;
}

export interface VehicleRoute {
  vehicleId: string;
  startDepotId: string;
  endDepotId: string;
  visits: StopVisit[];
  totalDistanceM: number;
  totalDurationS: number;
  drivingDurationS: number;
  waitingDurationS: number;
  serviceDurationS: number;
  peakLoadUnits: number;
  fixedCostCents: number;
  variableDistanceCostCents: number;
  variableTimeCostCents: number;
  totalCostCents: number;
}

export interface OptimizationResult {
  problemId: string;
  status: 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'TIMEOUT';
  algorithm: string;
  executionTimeMs: number;
  routes: VehicleRoute[];
  unassignedStops: Array<{ stopId: string; reason: string }>;
  objectiveCostCents: number;
  summary: {
    totalVehiclesUsed: number;
    totalStopsServiced: number;
    totalDistanceKm: number;
    totalDrivingHours: number;
    totalCostCents: number;
    slaCompliancePercent: number;
  };
}

export interface PlanComparison {
  baselineAlgorithm: string;
  optimizedAlgorithm: string;
  deltaCostCents: number;
  costSavingsPercent: number;
  deltaVehicles: number;
  deltaDistanceKm: number;
  deltaDrivingHours: number;
  baselineValid: boolean;
  optimizedValid: boolean;
  summary: string;
}

export interface CostToServeBreakdown {
  vehiclesDeployed: number;
  totalDistanceKm: number;
  totalShiftHours: number;
  regularHours: number;
  overtimeHours: number;
  lateStopsCount: number;
  unassignedStopsCount: number;
  fixedVehicleCostCents: number;
  distanceCostCents: number;
  regularLaborCostCents: number;
  overtimeLaborCostCents: number;
  latePenaltyCostCents: number;
  unassignedPenaltyCostCents: number;
  totalCostCents: number;
  averageCostPerStopCents: number;
  averageCostPerKmCents: number;
}

export interface MonteCarloConfidenceInterval {
  mean: number;
  stdError: number;
  lower95: number;
  upper95: number;
}

export interface ScenarioEvaluationTrack {
  trackName: 'HISTORICAL_ACTUAL' | 'GREEDY_BASELINE' | 'OPTIMIZED_PLAN';
  algorithm: string;
  vehiclesCount: number;
  distanceKm: number;
  shiftHours: number;
  onTimePercent: number;
  projectedCostCents: number;
  costBreakdown: CostToServeBreakdown;
  realizedCostStats?: MonteCarloConfidenceInterval;
}

export interface EvaluationReport {
  evaluationId: string;
  evaluationDate: string;
  historicalActual: ScenarioEvaluationTrack;
  greedyBaseline: ScenarioEvaluationTrack;
  optimizedPlan: ScenarioEvaluationTrack;
  comparison: {
    projectedCostSavingsVsActualCents: number;
    projectedSavingsPercentVsActual: number;
    projectedCostSavingsVsGreedyCents: number;
    projectedSavingsPercentVsGreedy: number;
    realizedExpectedSavingsVsActualCents: number;
    realizedSavingsConfidenceInterval95: MonteCarloConfidenceInterval;
    riskSummary: {
      slaBreachProbability: number;
      projectedVsRealizedDeltaCents: number;
      recommendation: string;
    };
  };
}

export interface SolverScenarioPayload {
  problem: ProblemDefinition;
  greedyResult: OptimizationResult;
  optimizedResult: OptimizationResult;
  comparison: PlanComparison;
  evaluationReport: EvaluationReport;
}
