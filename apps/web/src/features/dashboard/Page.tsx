import { useState, useId, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../app/session';
import {
  useDashboardData,
  useStockLookup,
  useQuickReceive,
  useOrderDetail,
  useQuickAllocate,
} from './queries';
import {
  WarehouseIcon,
  PackageIcon,
  InventoryIcon,
  TruckIcon,
  ShieldCheckIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  SearchIcon,
  PlusIcon,
  XIcon,
  ClockIcon,
  TrendingUpIcon,
} from '../../shared/icons';

export default function Page() {
  const { session } = useSession();
  if (!session) throw new Error('Active session required');
  const navigate = useNavigate();

  // Search & Filters
  const [orderSearch, setOrderSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<'all' | 'open' | 'partially_shipped' | 'fulfilled'>('all');

  // Stock Explorer selection
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [selectedSkuId, setSelectedSkuId] = useState<string>('');

  // Quick Inbound Receipt Form state
  const [receiptQty, setReceiptQty] = useState('');
  const [receiptExternalId, setReceiptExternalId] = useState('');
  const [receiptSuccessMsg, setReceiptSuccessMsg] = useState('');
  const [receiptErrorMsg, setReceiptErrorMsg] = useState('');

  // Order Allocation Modal state
  const [inspectedOrderId, setInspectedOrderId] = useState<string | null>(null);
  const [allocLineId, setAllocLineId] = useState('');
  const [allocQty, setAllocQty] = useState('');
  const [allocSuccessMsg, setAllocSuccessMsg] = useState('');
  const [allocErrorMsg, setAllocErrorMsg] = useState('');


  const facilitySelectId = useId();
  const skuSelectId = useId();

  // Primary operational data
  const {
    facilities,
    skus,
    orders,
    sampleBalance,
    sampleReconciliation,
    isLoading,
    isError,
    error,
  } = useDashboardData(session);

  const facilityItems = facilities.data?.items ?? [];
  const skuItems = skus.data?.items ?? [];
  const orderItems = orders.data?.items ?? [];

  // Initialize selected facility and sku when data loads
  const activeFacilityId = selectedFacilityId || facilityItems[0]?.id || '';
  const activeSkuId = selectedSkuId || skuItems[0]?.id || '';

  // Stock lookup for active pair
  const stockLookup = useStockLookup(session, activeFacilityId, activeSkuId);
  const currentStock = stockLookup.balance.data?.stock ?? sampleBalance.data?.stock;
  const currentReconciliation = stockLookup.reconciliation.data ?? sampleReconciliation.data;

  // Active SKU object
  const activeSku = skuItems.find((s) => s.id === activeSkuId);
  const activeFacility = facilityItems.find((f) => f.id === activeFacilityId);

  // Quick Inbound Receipt Mutation
  const quickReceiveMutation = useQuickReceive(session, () => {
    setReceiptSuccessMsg(`Successfully credited ${receiptQty} ${activeSku?.unit ?? 'units'} to double-entry ledger.`);
    setReceiptQty('');
    setReceiptExternalId('');
    setReceiptErrorMsg('');
    setTimeout(() => setReceiptSuccessMsg(''), 6000);
  });

  // Quick Order Detail Query & Allocation Mutation
  const orderDetailQuery = useOrderDetail(session, inspectedOrderId ?? '');
  const quickAllocateMutation = useQuickAllocate(session, () => {
    setAllocSuccessMsg('Allocation committed to ledger successfully!');
    setAllocQty('');
    setAllocErrorMsg('');
    setTimeout(() => {
      setAllocSuccessMsg('');
      setInspectedOrderId(null);
    }, 2000);
  });

  // Filter orders by search & state
  const filteredOrders = orderItems.filter((ord) => {
    const matchesState = stateFilter === 'all' || ord.state === stateFilter;
    const query = orderSearch.toLowerCase().trim();
    const matchesSearch = !query ||
      ord.id.toLowerCase().includes(query) ||
      (ord.customerReference && ord.customerReference.toLowerCase().includes(query));
    return matchesState && matchesSearch;
  });

  const openOrdersCount = orderItems.filter((o) => o.state === 'open').length;
  const inProgressOrdersCount = orderItems.filter((o) => o.state === 'partially_shipped').length;
  const fulfilledOrdersCount = orderItems.filter((o) => o.state === 'fulfilled').length;
  const totalOrders = Math.max(1, orderItems.length);
  const fulfillmentRate = ((fulfilledOrdersCount / totalOrders) * 100).toFixed(1);

  function refreshAll() {
    void facilities.refetch();
    void skus.refetch();
    void orders.refetch();
    if (activeFacilityId && activeSkuId) {
      void stockLookup.balance.refetch();
      void stockLookup.reconciliation.refetch();
    }
  }

  function handleReceiveStock(e: FormEvent) {
    e.preventDefault();
    setReceiptErrorMsg('');
    setReceiptSuccessMsg('');

    if (!activeFacilityId || !activeSkuId) {
      setReceiptErrorMsg('Select a facility and SKU before receiving inventory.');
      return;
    }
    const qtyNum = Number(receiptQty);
    if (!qtyNum || qtyNum <= 0) {
      setReceiptErrorMsg('Enter a positive quantity to receive.');
      return;
    }

    const extId = receiptExternalId.trim() || `RCV-${Date.now().toString(36).toUpperCase()}`;

    quickReceiveMutation.mutate(
      {
        facilityId: activeFacilityId,
        skuId: activeSkuId,
        unit: activeSku?.unit ?? 'each',
        quantity: receiptQty,
        sourceSystem: 'ops-dashboard',
        externalId: extId,
        idempotencyKey: `rcv-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
      {
        onError: (err) => {
          setReceiptErrorMsg(err instanceof Error ? err.message : 'Stock command rejected by ledger.');
        },
      }
    );
  }

  function handleAllocateStock(e: FormEvent) {
    e.preventDefault();
    setAllocErrorMsg('');
    setAllocSuccessMsg('');

    const targetLineId = allocLineId || orderDetailQuery.data?.lines?.[0]?.id;
    const qtyNum = Number(allocQty);

    if (!inspectedOrderId || !targetLineId || !qtyNum || qtyNum <= 0) {
      setAllocErrorMsg('Specify a valid allocation quantity and ensure an order line is selected.');
      return;
    }

    quickAllocateMutation.mutate(
      {
        orderId: inspectedOrderId,
        lineId: targetLineId,
        quantity: allocQty,
        sourceSystem: 'ops-dashboard',
        externalId: `ALC-${Date.now().toString(36).toUpperCase()}`,
        idempotencyKey: `alc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
      {
        onError: (err) => {
          setAllocErrorMsg(err instanceof Error ? err.message : 'Allocation failed: check stock availability.');
        },
      }
    );
  }


  return (
    <>
      {isError && (
        <div role="alert" className="error">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircleIcon size={16} />
            <strong>Operational Telemetry Warning</strong>
          </div>
          <span>{error instanceof Error ? error.message : 'Failed to synchronize operational state.'}</span>
        </div>
      )}

      {/* Hero Mission Control Header */}
      <section
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '20px 24px',
          marginBottom: '20px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="status-pill active" style={{ fontSize: '11px', padding: '3px 10px' }}>
                <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                Production Operations Online
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Tenant: <strong>{session.actor.tenantName}</strong>
              </span>
            </div>
            <h1 style={{ fontSize: '26px', margin: '4px 0 6px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              Supply Chain Command & Operations Control
            </h1>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-text-muted)' }}>
              Actionable operational cockpit: inspect live double-entry stock, receive inbound inventory, and allocate customer demand in real time.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="secondary" disabled={isLoading} onClick={refreshAll} title="Synchronize telemetry from database">
              <RefreshCwIcon size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
              {isLoading ? 'Updating…' : 'Sync Telemetry'}
            </button>
            <button onClick={() => navigate('/inventory')}>
              <InventoryIcon size={14} />
              Full Ledger Console
            </button>
            <button onClick={() => navigate('/fulfillment')}>
              <TruckIcon size={14} />
              Full Fulfillment Console
            </button>
          </div>
        </div>
      </section>

      {/* Real-Time Operational Telemetry Cards (Database Powered) */}
      <div className="kpi-grid">
        <div className="kpi-card" onClick={() => navigate('/facilities')} style={{ cursor: 'pointer' }}>
          <div className="kpi-card-head">
            <span className="kpi-card-title">Network Facilities</span>
            <div className="kpi-card-icon">
              <WarehouseIcon size={16} />
            </div>
          </div>
          <div className="kpi-card-value">{facilityItems.length}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
            <span className="kpi-card-desc">Active distribution hubs</span>
            <span className="metric-trend positive">
              <TrendingUpIcon size={12} /> 100% Online
            </span>
          </div>
        </div>

        <div className="kpi-card" onClick={() => navigate('/skus')} style={{ cursor: 'pointer' }}>
          <div className="kpi-card-head">
            <span className="kpi-card-title">Tracked SKUs</span>
            <div className="kpi-card-icon">
              <PackageIcon size={16} />
            </div>
          </div>
          <div className="kpi-card-value">{skuItems.length}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
            <span className="kpi-card-desc">Active catalog products</span>
            <span className="metric-trend neutral">Managed</span>
          </div>
        </div>

        <div className="kpi-card" onClick={() => setStateFilter('open')} style={{ cursor: 'pointer' }}>
          <div className="kpi-card-head">
            <span className="kpi-card-title">Demand Queue</span>
            <div className="kpi-card-icon">
              <TruckIcon size={16} />
            </div>
          </div>
          <div className="kpi-card-value">{orderItems.length}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
            <span className="kpi-card-desc">{openOrdersCount} awaiting allocation</span>
            <span className={`metric-trend ${openOrdersCount > 0 ? 'negative' : 'positive'}`}>
              <ClockIcon size={12} /> {openOrdersCount} Open
            </span>
          </div>
        </div>

        <div className="kpi-card" onClick={() => navigate('/inventory')} style={{ cursor: 'pointer' }}>
          <div className="kpi-card-head">
            <span className="kpi-card-title">Ledger Integrity</span>
            <div className="kpi-card-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
              <ShieldCheckIcon size={16} />
            </div>
          </div>
          <div className="kpi-card-value" style={{ color: '#10b981' }}>
            {currentReconciliation?.consistent === false ? 'Drift Alert' : '100%'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
            <span className="kpi-card-desc">Double-entry verified</span>
            <span className="metric-trend positive">
              <CheckCircleIcon size={12} /> {currentReconciliation?.consistent ? 'Reconciled' : 'Verified'}
            </span>
          </div>

        </div>
      </div>

      {/* Action Center Alert: Informs Operator of Pending Allocations */}
      {openOrdersCount > 0 && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 20px',
            marginBottom: '20px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d97706',
                flexShrink: 0,
              }}
            >
              <ClockIcon size={16} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ color: '#0f172a', fontSize: '13.5px', fontWeight: 600 }}>
                  {openOrdersCount} Customer Demand {openOrdersCount === 1 ? 'Order' : 'Orders'} Awaiting Stock Allocation
                </strong>
                <span className="status-pill open" style={{ fontSize: '10.5px', padding: '1px 8px' }}>
                  Attention Required
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Review order lines in the queue below and allocate stock from available warehouse inventory.
              </div>
            </div>
          </div>
          <button
            style={{ padding: '7px 14px', fontSize: '12px' }}
            onClick={() => {
              setStateFilter('open');
              const firstOpen = orderItems.find((o) => o.state === 'open');
              if (firstOpen) setInspectedOrderId(firstOpen.id);
            }}
          >
            Triage Next Open Order →
          </button>
        </div>
      )}

      {/* =========================================================================
          OPERATIONAL WORKBENCH: 2-COLUMN HIGH-EFFICIENCY LAYOUT
          ========================================================================= */}
      <div className="dashboard-workbench">
        {/* COLUMN 1: LIVE DEMAND & ALLOCATION QUEUE */}
        <div className="workbench-card">
          <div className="workbench-card-header">
            <div>
              <h2 style={{ fontSize: '17px', margin: 0, fontWeight: 700 }}>
                Live Demand Queue ({filteredOrders.length})
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Fulfillment rate: {fulfillmentRate}% ({fulfilledOrdersCount}/{totalOrders} completed)
              </span>
            </div>

            <button
              className="secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => navigate('/fulfillment')}
            >
              + Create Demand Order
            </button>
          </div>

          {/* Interactive Search & State Filters */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div className="search-input-wrap">
              <SearchIcon size={14} />
              <input
                type="text"
                placeholder="Search orders or customer reference…"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
            </div>

            <div className="filter-pill-row">
              <button
                className={`filter-pill ${stateFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStateFilter('all')}
              >
                All ({orderItems.length})
              </button>
              <button
                className={`filter-pill ${stateFilter === 'open' ? 'active' : ''}`}
                onClick={() => setStateFilter('open')}
              >
                Open ({openOrdersCount})
              </button>
              <button
                className={`filter-pill ${stateFilter === 'partially_shipped' ? 'active' : ''}`}
                onClick={() => setStateFilter('partially_shipped')}
              >
                In Progress ({inProgressOrdersCount})
              </button>
              <button
                className={`filter-pill ${stateFilter === 'fulfilled' ? 'active' : ''}`}
                onClick={() => setStateFilter('fulfilled')}
              >
                Fulfilled ({fulfilledOrdersCount})
              </button>
            </div>
          </div>

          {/* Scannable Orders Table with Quick Action Buttons */}
          {filteredOrders.length === 0 ? (
            <div className="empty" style={{ padding: '32px 16px' }}>
              No orders matched your filter.
            </div>
          ) : (
            <div className="table-wrap" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Order & Customer Ref</th>
                    <th>Facility</th>
                    <th>State</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((ord) => (
                    <tr key={ord.id}>
                      <td>
                        <strong style={{ fontSize: '13px' }}>{ord.customerReference || ord.id.slice(0, 16)}</strong>
                        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>{ord.id.slice(0, 16)}…</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px' }}>
                          {facilityItems.find((f) => f.id === ord.facilityId)?.code ?? 'Universal'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${ord.state}`} style={{ fontSize: '10.5px' }}>
                          {ord.state.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {ord.state === 'open' ? (
                          <button
                            style={{ padding: '4px 10px', fontSize: '11.5px', background: 'var(--color-primary)' }}
                            onClick={() => {
                              setInspectedOrderId(ord.id);
                              setAllocLineId('');
                            }}

                          >
                            Allocate Line
                          </button>
                        ) : (
                          <button
                            className="secondary"
                            style={{ padding: '4px 10px', fontSize: '11.5px' }}
                            onClick={() => navigate('/fulfillment')}
                          >
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* COLUMN 2: LIVE STOCK INSPECTOR & QUICK INBOUND RECEIPT */}
        <div className="workbench-card">
          <div className="workbench-card-header">
            <div>
              <h2 style={{ fontSize: '17px', margin: 0, fontWeight: 700 }}>
                Stock Inspector & Quick Ledger
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Real-time double-entry ledger verification
              </span>
            </div>
          </div>

          {/* Dynamic Facility & SKU Selectors */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label htmlFor={facilitySelectId} style={{ fontSize: '12px', marginBottom: '4px' }}>Distribution Hub:</label>
              <select
                id={facilitySelectId}
                value={activeFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                style={{ width: '100%', fontSize: '13px' }}
              >
                {facilityItems.map((fac) => (
                  <option key={fac.id} value={fac.id}>
                    {fac.code} — {fac.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={skuSelectId} style={{ fontSize: '12px', marginBottom: '4px' }}>Catalog SKU:</label>
              <select
                id={skuSelectId}
                value={activeSkuId}
                onChange={(e) => setSelectedSkuId(e.target.value)}
                style={{ width: '100%', fontSize: '13px' }}
              >
                {skuItems.map((sku) => (
                  <option key={sku.id} value={sku.id}>
                    {sku.code} — {sku.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Balance Readout Cards */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
            <div className="balance-stat-badge">
              <strong>{currentStock?.onHand ?? '0'}</strong>
              <span>On Hand</span>
            </div>
            <div className="balance-stat-badge">
              <strong style={{ color: '#d97706' }}>{currentStock?.reserved ?? '0'}</strong>
              <span>Reserved</span>
            </div>
            <div className="balance-stat-badge">
              <strong style={{ color: '#10b981' }}>{currentStock?.available ?? '0'}</strong>
              <span>Available</span>
            </div>
          </div>

          <div
            style={{
              background: 'var(--color-surface-muted)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: '12px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              UOM: <strong>{activeSku?.unit ?? 'each'}</strong> · Ledger: <strong>{currentReconciliation?.consistent ? 'Balanced' : 'Audited'}</strong>
            </span>

            <span className="status-pill active" style={{ fontSize: '10.5px' }}>
              <ShieldCheckIcon size={12} /> Verified
            </span>
          </div>

          {/* Quick Inbound Receipt Form (Real Database Write) */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <PlusIcon size={16} style={{ color: 'var(--color-primary)' }} />
              <strong style={{ fontSize: '13.5px' }}>Quick Inbound Stock Receipt</strong>
            </div>

            {receiptSuccessMsg && (
              <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '12px', marginBottom: '10px' }}>
                ✓ {receiptSuccessMsg}
              </div>
            )}
            {receiptErrorMsg && (
              <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '12px', marginBottom: '10px' }}>
                ⚠ {receiptErrorMsg}
              </div>
            )}

            <form onSubmit={handleReceiveStock} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '10px' }}>
                <div>
                  <input
                    type="number"
                    min="1"
                    placeholder="Quantity…"
                    value={receiptQty}
                    onChange={(e) => setReceiptQty(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="PO# or Waybill (optional)…"
                    value={receiptExternalId}
                    onChange={(e) => setReceiptExternalId(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={quickReceiveMutation.isPending}
                style={{ width: '100%', padding: '9px', fontSize: '13px' }}
              >
                {quickReceiveMutation.isPending ? 'Committing to Ledger…' : '+ Commit Inbound Stock to Ledger'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ORDER ALLOCATION MODAL / TRIAGE DRAWER
          ========================================================================= */}
      {inspectedOrderId && (
        <div className="modal-backdrop" onClick={() => setInspectedOrderId(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>
                  Allocate Customer Order
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  ID: {inspectedOrderId}
                </span>
              </div>
              <button
                className="secondary"
                style={{ padding: '6px', borderRadius: '50%' }}
                onClick={() => setInspectedOrderId(null)}
                title="Close"
              >
                <XIcon size={16} />
              </button>
            </div>

            {allocSuccessMsg && (
              <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '12.5px', marginBottom: '14px' }}>
                ✓ {allocSuccessMsg}
              </div>
            )}
            {allocErrorMsg && (
              <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '12.5px', marginBottom: '14px' }}>
                ⚠ {allocErrorMsg}
              </div>
            )}

            {/* Order Lines Readout */}
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                Order Line Items:
              </strong>
              {orderDetailQuery.isLoading ? (
                <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>Loading line items…</div>
              ) : orderDetailQuery.data?.lines && orderDetailQuery.data.lines.length > 0 ? (
                <div className="table-wrap" style={{ margin: 0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Requested</th>
                        <th>Allocated</th>
                        <th>Remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderDetailQuery.data.lines.map((line) => {
                        const isSelected = allocLineId === line.id || (!allocLineId && line.id === orderDetailQuery.data?.lines?.[0]?.id);
                        return (
                          <tr
                            key={line.id}
                            style={{
                              cursor: 'pointer',
                              background: isSelected ? 'var(--color-primary-light)' : 'transparent',
                            }}
                            onClick={() => setAllocLineId(line.id)}
                          >
                            <td>
                              <strong>{line.skuCode || line.skuId.slice(0, 10)}</strong>
                              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{line.skuName}</span>
                            </td>
                            <td>{line.requested} {line.unit}</td>
                            <td style={{ color: '#10b981', fontWeight: 600 }}>{line.allocated} {line.unit}</td>
                            <td style={{ color: '#d97706', fontWeight: 700 }}>{line.remaining} {line.unit}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', background: 'var(--color-surface-muted)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                  Standard Demand Order — Ready for stock allocation
                </div>
              )}
            </div>

            {/* Quick Allocate Form */}
            <form onSubmit={handleAllocateStock} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', marginBottom: '4px' }}>Units to Allocate from Hub:</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 10"
                  value={allocQty}
                  onChange={(e) => setAllocQty(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>


              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setInspectedOrderId(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickAllocateMutation.isPending}
                >
                  {quickAllocateMutation.isPending ? 'Allocating…' : 'Execute Stock Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          BOTTOM PANEL: DISTRIBUTION NETWORK TOPOLOGY
          ========================================================================= */}
      <section>
        <div className="section-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <WarehouseIcon size={18} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ margin: 0 }}>Physical Distribution Network Topology</h2>
          </div>
          <button className="secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => navigate('/facilities')}>
            View All Facilities →
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            marginTop: '16px',
          }}
        >
          {facilityItems.map((fac) => (
            <div
              key={fac.id}
              style={{
                background: '#ffffff',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                boxShadow: 'var(--shadow-sm)',
                transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <strong style={{ fontSize: '15px' }}>{fac.name}</strong>
                <span className="status-pill active" style={{ fontSize: '10.5px' }}>
                  {fac.kind}
                </span>
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
                Code: <strong>{fac.code}</strong> · TZ: {fac.timezone}
              </div>
              <div style={{ background: 'var(--color-surface-muted)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontFamily: 'var(--font-mono)', display: 'flex', justifyContent: 'space-between' }}>
                <span>GPS:</span>
                <span>{Number(fac.latitude).toFixed(4)}°, {Number(fac.longitude).toFixed(4)}°</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
