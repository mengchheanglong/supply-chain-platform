import { performance } from 'node:perf_hooks';
export class HttpMetrics {
  private readonly routes = new Map<string,{count:number;errors:number;durationMs:number}>();
  record(route:string,status:number,started:number) {
    const row = this.routes.get(route) ?? {count:0,errors:0,durationMs:0};
    row.count++; row.errors += Number(status>=500); row.durationMs += performance.now()-started;
    this.routes.set(route,row);
  }
  snapshot() { return Object.fromEntries([...this.routes].map(([key,value])=>[key,{...value}])); }
}
