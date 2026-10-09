import { useState } from 'react';
import { useSession } from '../../app/session';
export default function Connect() {
  const {busy,error,connect} = useSession(), [token,setToken] = useState('');
  return <section className="connect"><h2>Connect to your organization</h2><p>Use a scoped operator or reader credential provisioned by the local administrator.</p>
    {error && <div role="alert" className="error">{error}</div>}
    <form onSubmit={async event=>{event.preventDefault();const credential=token;setToken('');await connect(credential);}}>
      <label>Access credential<input type="password" required autoComplete="off" value={token} onChange={event=>setToken(event.target.value)}/></label>
      <button disabled={busy}>{busy?'Connecting…':'Connect'}</button>
    </form><small>Credentials stay in memory for this session. Reloading or disconnecting clears access.</small>
  </section>;
}
