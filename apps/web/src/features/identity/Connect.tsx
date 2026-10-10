import { useState } from 'react';
import { useSession } from '../../app/session';
import { KeyIcon, ShieldCheckIcon, DatabaseIcon, ActivityIcon } from '../../shared/icons';

const DEMO_OPERATOR_TOKEN = '2rTa1EJWQC6EyeyhpIcsDf2rEpRPBLGAz7eFwCwRQQo';

export default function Connect() {
  const { busy, error, connect } = useSession();
  const [token, setToken] = useState('');

  return (
    <section className="connect">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div className="brand-icon-box" style={{ width: 38, height: 38 }}>
          <KeyIcon size={20} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Connect to your organization</h2>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Supply Chain Operations & Ledger Authentication</span>
        </div>
      </div>
      <p style={{ marginTop: '12px' }}>
        Enter a tenant-scoped operator or reader credential provisioned by the PostgreSQL PostGIS administrator.
      </p>

      {error && <div role="alert" className="error">{error}</div>}

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const credential = token.trim();
          setToken('');
          await connect(credential);
        }}
      >
        <label>
          Access credential
          <input
            type="password"
            required
            autoComplete="off"
            placeholder="Paste your 43-character base64url token"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
        </label>
        <button disabled={busy || !token.trim()}>
          <KeyIcon size={16} />
          {busy ? 'Connecting…' : 'Connect'}
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', padding: '14px', background: 'var(--color-surface-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--color-text-muted)' }}>
            Local Development Quick Fill
          </span>
          <button
            type="button"
            className="secondary"
            style={{ padding: '4px 10px', fontSize: 11.5 }}
            disabled={busy}
            onClick={() => setToken(DEMO_OPERATOR_TOKEN)}
          >
            Fill Demo Token
          </button>
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          Tenant: Cambodia Express Logistics (Operator)
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
          <ShieldCheckIcon size={14} style={{ color: 'var(--color-accent)' }} />
          <span>PostGIS RLS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
          <DatabaseIcon size={14} style={{ color: 'var(--color-accent)' }} />
          <span>Ledger Safe</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
          <ActivityIcon size={14} style={{ color: 'var(--color-accent)' }} />
          <span>In-Memory Auth</span>
        </div>
      </div>

      <small style={{ display: 'block', marginTop: '16px' }}>
        Credentials stay strictly in memory for this session. Reloading or disconnecting clears access immediately.
      </small>
    </section>
  );
}
