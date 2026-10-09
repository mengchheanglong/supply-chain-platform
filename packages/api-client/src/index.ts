import type { paths } from '@supply-chain/contracts';
type Method = 'get' | 'post';
type MethodFor<P extends keyof paths> = { [M in Method]: Operation<P,M> extends never ? never : M }[Method];
type Operation<P extends keyof paths,M extends Method> = M extends keyof paths[P] ? NonNullable<paths[P][M]> : never;
type Response<O> = O extends {responses:infer R} ? (200 extends keyof R ? R[200] : 201 extends keyof R ? R[201] : never) extends {content:{'application/json':infer T}} ? T : never : never;
type Body<O> = O extends {requestBody:{content:{'application/json':infer T}}} ? T : never;
export type RequestOptions = {token?:string;signal?:AbortSignal;query?:Record<string,string | number | undefined>;baseUrl?:string};
export class ApiError extends Error {
  constructor(public readonly status:number,message:string) { super(message); }
}
export async function api<P extends keyof paths,M extends MethodFor<P>>(path:P,method:M,options:RequestOptions & {body?:Body<Operation<P,M>>}={}):Promise<Response<Operation<P,M>>> {
  const query = new URLSearchParams();
  for (const [key,value] of Object.entries(options.query ?? {})) if(value!==undefined) query.set(key,String(value));
  const signal = options.signal ? AbortSignal.any([options.signal,AbortSignal.timeout(6000)]) : AbortSignal.timeout(6000);
  const response = await fetch((options.baseUrl ?? '')+path+(query.size?'?'+query:''),{method:method.toUpperCase(),cache:'no-store',signal,
    headers:{...(options.token?{Authorization:'Bearer '+options.token}:{}),...(options.body?{'Content-Type':'application/json'}:{})},
    ...(options.body?{body:JSON.stringify(options.body)}:{})});
  if(!response.ok) {
    const data = await response.json().catch(()=>null), message = data?.error?.message ?? data?.error;
    throw new ApiError(response.status,Array.isArray(message)?message.join('; '):typeof message==='string'?message:`Request failed (${response.status})`);
  }
  return response.json();
}
