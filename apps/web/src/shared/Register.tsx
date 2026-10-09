import type { ReactNode } from 'react';
export function Register({title,count,loading,error,children,hasNext,hasPrevious,onNext,onPrevious,onRefresh}:{title:string;count:number;loading:boolean;error:string;children:ReactNode;hasNext:boolean;hasPrevious:boolean;onNext():void;onPrevious():void;onRefresh():void}) {
  return <section>{error&&<div className="error" role="alert">{error}</div>}<div className="section-head"><h2>{title}</h2><span>{count} records on this page · operational source</span></div>
    {loading?<p role="status">Loading records…</p>:children}
    {!loading&&!error&&count===0&&<p className="empty">No records on this page.</p>}
    <div className="pagination"><button disabled={loading||!hasPrevious} onClick={onPrevious}>Previous page</button><button disabled={loading||!hasNext} onClick={onNext}>Next page</button><button className="secondary" disabled={loading} onClick={onRefresh}>Refresh</button></div>
    <small>50 records per page. Writes are confirmed by the server.</small></section>;
}
