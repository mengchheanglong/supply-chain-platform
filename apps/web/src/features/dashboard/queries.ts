import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@supply-chain/api-client';
import type { StockCommand, AllocateInput } from '@supply-chain/contracts';
import { sessionSignal, type Session } from '../../app/session';

export function useDashboardData(session: Session) {
  const token = session.credential;

  const facilities = useQuery({
    queryKey: ['dashboard', session.actor.tenantId, session.id, 'facilities'],
    queryFn: ({ signal }) =>
      api('/api/v1/facilities', 'get', {
        token,
        signal: sessionSignal(session, signal),
        query: { limit: 50 },
      }),
  });

  const skus = useQuery({
    queryKey: ['dashboard', session.actor.tenantId, session.id, 'skus'],
    queryFn: ({ signal }) =>
      api('/api/v1/skus', 'get', {
        token,
        signal: sessionSignal(session, signal),
        query: { limit: 50 },
      }),
  });

  const orders = useQuery({
    queryKey: ['dashboard', session.actor.tenantId, session.id, 'orders'],
    queryFn: ({ signal }) =>
      api('/api/v1/fulfillment/orders', 'get', {
        token,
        signal: sessionSignal(session, signal),
        query: { limit: 50 },
      }),
  });

  // Query balance for first facility and SKU when available as default
  const firstFacilityId = facilities.data?.items?.[0]?.id;
  const firstSkuId = skus.data?.items?.[0]?.id;
  const hasSamplePair = !!firstFacilityId && !!firstSkuId;

  const sampleBalance = useQuery({
    queryKey: ['dashboard', session.actor.tenantId, session.id, 'balance', firstFacilityId, firstSkuId],
    enabled: hasSamplePair,
    queryFn: ({ signal }) =>
      api('/api/v1/inventory/balance', 'get', {
        token,
        signal: sessionSignal(session, signal),
        query: { facilityId: firstFacilityId, skuId: firstSkuId },
      }),
  });

  const sampleReconciliation = useQuery({
    queryKey: ['dashboard', session.actor.tenantId, session.id, 'reconciliation', firstFacilityId, firstSkuId],
    enabled: hasSamplePair,
    queryFn: ({ signal }) =>
      api('/api/v1/inventory/reconciliation', 'get', {
        token,
        signal: sessionSignal(session, signal),
        query: { facilityId: firstFacilityId, skuId: firstSkuId },
      }),
  });

  return {
    facilities,
    skus,
    orders,
    sampleBalance,
    sampleReconciliation,
    isLoading: facilities.isFetching || skus.isFetching || orders.isFetching,
    isError: facilities.isError || skus.isError || orders.isError,
    error: facilities.error || skus.error || orders.error,
  };
}

export function useStockLookup(session: Session, facilityId: string, skuId: string) {
  const token = session.credential;
  const enabled = Boolean(facilityId && skuId);

  const balance = useQuery({
    queryKey: ['dashboard', session.actor.tenantId, session.id, 'lookup-balance', facilityId, skuId],
    enabled,
    queryFn: ({ signal }) =>
      api('/api/v1/inventory/balance', 'get', {
        token,
        signal: sessionSignal(session, signal),
        query: { facilityId, skuId },
      }),
  });

  const reconciliation = useQuery({
    queryKey: ['dashboard', session.actor.tenantId, session.id, 'lookup-reconciliation', facilityId, skuId],
    enabled,
    queryFn: ({ signal }) =>
      api('/api/v1/inventory/reconciliation', 'get', {
        token,
        signal: sessionSignal(session, signal),
        query: { facilityId, skuId },
      }),
  });

  return { balance, reconciliation };
}

export function useQuickReceive(session: Session, onSuccess: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: StockCommand) =>
      api('/api/v1/inventory/receive', 'post', {
        token: session.credential,
        signal: sessionSignal(session),
        body,
      }),
    onSuccess: async () => {
      onSuccess();
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory', session.actor.tenantId, session.id] });
    },
  });
}

export function useOrderDetail(session: Session, orderId: string) {
  return useQuery({
    queryKey: ['dashboard', session.actor.tenantId, session.id, 'order-detail', orderId],
    enabled: Boolean(orderId),
    queryFn: ({ signal }) =>
      api('/api/v1/fulfillment/order', 'get', {
        token: session.credential,
        signal: sessionSignal(session, signal),
        query: { orderId },
      }),
  });
}

export function useQuickAllocate(session: Session, onSuccess: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AllocateInput) =>
      api('/api/v1/fulfillment/allocate', 'post', {
        token: session.credential,
        signal: sessionSignal(session),
        body,
      }),
    onSuccess: async () => {
      onSuccess();
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['workflow', session.actor.tenantId, session.id] });
    },
  });
}
