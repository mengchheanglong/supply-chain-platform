import { useQuery } from '@tanstack/react-query';
import { api } from '@supply-chain/api-client';
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

  // Query balance for first facility and SKU when available
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
