import type { Actor } from '../../identity/public';
import type { FacilityService } from '../../facilities/public';
import type { SkuService } from '../../catalog/public';
import { decimal, normalizeQuantity, quantityAtoms, type InventoryService } from '../../inventory/public';
import type { AuditService } from '../../audit/public';
import { OperationalError, type Transaction, type UnitOfWork, type Runtime, type Page, type PageResult, type OperationalList } from '../../../platform/ports';
import { sourceInput, uuidInput } from '../../../platform/command-input';
import { pageInput } from '../../../platform/pagination';
import { parseCsv, csvDocument, STOCK_HEADERS } from '../domain/csv';
import type { ExchangeSource, MappingInput, Mapping, ImportInput, ExportInput, ExchangeAction, ExchangeReceipt, ExchangeDocument, QualityIssue, StagedStock, MappingReceipt, SnapshotInput, SnapshotManifest, SnapshotArtifact, SnapshotSummary, SnapshotArtifactSummary } from '../domain/model';
export interface SnapshotDataset {
 facilities: Array<{id:string;code:string;name:string;kind:string;timezone:string;latitude:number;longitude:number;locationSource:string;sourceSystem:string;externalId:string}>;
 skus: Array<{id:string;code:string;name:string;unit:'each'|'kg'|'m3'|'litre';quantityPrecision:number;sourceSystem:string;externalId:string}>;
 stock: Array<{facilityId:string;skuId:string;unit:'each'|'kg'|'m3'|'litre';quantityPrecision:number;onHand:string;reserved:string;available:string}>;
 orders: Array<{orderId:string;facilityId:string;customerReference:string;state:string;sourceSystem:string;externalId:string;lineId:string;skuId:string;skuCode:string;skuName:string;unit:string;quantityPrecision:number;requested:string;allocated:string;shipped:string;createdAt:string}>;
}
export interface ExchangeRepository {
 previous(tx:Transaction,actor:Actor,key:string):Promise<{fingerprint:string;result:ExchangeReceipt}|null>;
 complete(tx:Transaction,actor:Actor,input:ExchangeSource,action:ExchangeAction,fingerprint:string,result:ExchangeReceipt):Promise<void>;
 mapping(tx:Transaction,actor:Actor,id:string,input:MappingInput):Promise<Mapping>;
 mappings(tx:Transaction,actor:Actor,page:Page):Promise<PageResult<Mapping>>;
 resolve(tx:Transaction,actor:Actor,source:string,refs:string[]):Promise<Mapping[]>;
 imported(tx:Transaction,actor:Actor,source:string,ids:string[]):Promise<string[]>;
 document(tx:Transaction,actor:Actor,document:ExchangeDocument):Promise<void>;
 get(tx:Transaction,actor:Actor,id:string):Promise<ExchangeDocument|null>;
 list(tx:Transaction,actor:Actor,page:Page):Promise<PageResult<Pick<ExchangeDocument,'id'|'kind'|'state'|'sourceSystem'|'externalId'|'generatedAt'|'totalRows'|'acceptedRows'>>>;
 extract(tx:Transaction,actor:Actor):Promise<SnapshotDataset>;
 saveSnapshot(tx:Transaction,actor:Actor,snapshot:SnapshotManifest,artifacts:SnapshotArtifact[]):Promise<void>;
 getSnapshot(tx:Transaction,actor:Actor,id:string):Promise<SnapshotManifest|null>;
 getArtifact(tx:Transaction,actor:Actor,snapshotId:string,name:string):Promise<SnapshotArtifact|null>;
 listSnapshots(tx:Transaction,actor:Actor,page:Page):Promise<PageResult<SnapshotSummary>>;
}
export interface ContentDigest {sha256(value:string):string}
export class ExchangeService {
 constructor(private readonly work:UnitOfWork,private readonly repository:ExchangeRepository,private readonly facilities:FacilityService,private readonly catalog:SkuService,
  private readonly inventory:InventoryService,private readonly audit:AuditService,private readonly runtime:Runtime,private readonly digest:ContentDigest) {}
 private operator(actor:Actor){if(actor.role!=='operator')throw new OperationalError(403,'An operator credential is required');}
 private identifier(value:string){if(typeof value!=='string'||value.length>160||!/^\S(?:[^\r\n]*\S)?$/.test(value))throw new OperationalError(400,'Invalid source identifier');return value;}
 private async receipt<T extends ExchangeReceipt>(actor:Actor,action:ExchangeAction,input:ExchangeSource,fingerprint:string,work:(tx:Transaction)=>Promise<T>) {
  sourceInput(input);return this.work.transaction(actor,async tx=>{
   const previous=await this.repository.previous(tx,actor,input.idempotencyKey);
   if(previous){if(previous.fingerprint!==fingerprint)throw new OperationalError(409,'Idempotency key was already used for a different command');return previous.result as T;}
   const result=await work(tx);await this.repository.complete(tx,actor,input,action,fingerprint,result);return result;
  });
 }
 map(actor:Actor,input:MappingInput) {
  this.operator(actor);if(!['facility','sku'].includes(input.entity))throw new OperationalError(400,'Invalid mapping entity');this.identifier(input.sourceExternalId);const targetId=uuidInput(input.targetId);
  return this.receipt<MappingReceipt>(actor,'mapping',input,this.digest.sha256(JSON.stringify(['mapping',input.entity,input.sourceExternalId,targetId,input.sourceSystem,input.externalId])),async tx=>{
   const found=input.entity==='facility'?await this.facilities.exists(tx,actor,targetId):await this.catalog.stockMetadata(tx,actor,targetId);if(!found)throw new OperationalError(404,'Mapping target not found in this tenant');
   const mapping=await this.repository.mapping(tx,actor,this.runtime.id(),{...input,targetId});
   await this.audit.append(tx,actor,mapping.id,'source_mapping',input.sourceSystem,'mapped',undefined,{domain:'integrations',key:input.idempotencyKey});
   return {schemaVersion:1,source:'operational',tenantId:actor.tenantId,idempotencyKey:input.idempotencyKey,mapping};
  });
 }
 import(actor:Actor,input:ImportInput) {
  this.operator(actor);if(input.schemaVersion!==1||typeof input.csv!=='string'||input.csv.length<1||input.csv.length>40000||typeof input.fileName!=='string'||!/^\S[^\r\n]{0,158}\S$|^\S$/.test(input.fileName))throw new OperationalError(400,'Use schema 1, a file name and CSV of 1–40000 characters');
  const contentSha256=this.digest.sha256(input.csv);
  return this.receipt<ExchangeDocument>(actor,'import',input,this.digest.sha256(JSON.stringify(['import',input.schemaVersion,input.fileName,contentSha256,input.sourceSystem,input.externalId])),async tx=>{
   let rows:string[][]=[];const issues:QualityIssue[]=[],records:StagedStock[]=[];const generatedAt=this.runtime.now();
   const issue=(row:number,field:string,code:string,message:string)=>issues.push({row,field,code,message});
   try{rows=parseCsv(input.csv);}catch(error){issue(1,'csv','CSV_SYNTAX',(error as Error).message);}
   const header=rows[0]??[],validHeader=header.length===STOCK_HEADERS.length&&new Set(header).size===header.length&&STOCK_HEADERS.every(name=>header.includes(name));
   if(!issues.length&&!validHeader)issue(1,'header','SCHEMA','Header must contain exactly '+STOCK_HEADERS.join(','));
   if(!issues.length&&rows.length<2)issue(1,'csv','EMPTY','CSV requires at least one data record');
   if(!issues.length) {
    const values=rows.slice(1).map(row=>Object.fromEntries(header.map((name,i)=>[name,row[i]??''])));
    // Serializes source-record registration across import files, not operational stock.
    const prior=new Set(await this.repository.imported(tx,actor,input.sourceSystem,values.map(row=>row.record_id!)));
    const mappings=await this.repository.resolve(tx,actor,input.sourceSystem,[...new Set(values.flatMap(row=>[row.facility_ref!,row.sku_ref!]))]);
    const targets=new Map(mappings.map(mapping=>[mapping.entity+'/'+mapping.sourceExternalId,mapping.targetId]));
    const skus=new Map<string,NonNullable<Awaited<ReturnType<SkuService['stockMetadata']>>>>(),seen=new Set<string>(),stockKeys=new Set<string>();
    for(let i=0;i<values.length;i++) {
     const row=values[i]!,number=i+2,before=issues.length;
     if(rows[i+1]!.length!==header.length)issue(number,'csv','COLUMNS','Record column count differs from header');
     for(const field of ['record_id','facility_ref','sku_ref']) {try{this.identifier(row[field]!);}catch{issue(number,field,'IDENTITY','A nonblank source reference of at most 160 characters is required');}}
     if(seen.has(row.record_id!)||prior.has(row.record_id!))issue(number,'record_id','DUPLICATE','Source record is repeated in this file or an earlier validated import');seen.add(row.record_id!);
     const facilityId=targets.get('facility/'+row.facility_ref),skuId=targets.get('sku/'+row.sku_ref);
     if(!facilityId)issue(number,'facility_ref','UNMAPPED','No facility mapping in this tenant/source');if(!skuId)issue(number,'sku_ref','UNMAPPED','No SKU mapping in this tenant/source');
     const stockKey=JSON.stringify([facilityId??row.facility_ref,skuId??row.sku_ref]);if(stockKeys.has(stockKey))issue(number,'sku_ref','DUPLICATE_STOCK','One observation per source facility/SKU is required');stockKeys.add(stockKey);
     if(!['each','kg','m3','litre'].includes(row.unit!))issue(number,'unit','UNIT','An explicit supported unit is required');
     let sku=skuId?skus.get(skuId):undefined;
     if(skuId&&!sku){const metadata=await this.catalog.stockMetadata(tx,actor,skuId);if(metadata){sku=metadata;skus.set(skuId,metadata);}}
     if(sku&&sku.unit!==row.unit)issue(number,'unit','UNIT_MISMATCH','Unit differs from mapped SKU; conversion is not implicit');
     let onHand:bigint|undefined,reserved:bigint|undefined;
     for(const field of ['on_hand','reserved']) {
      try{const normalized=normalizeQuantity(row[field]!);const amount=sku?normalized==='0'?0n:quantityAtoms(row[field]!,sku.quantityPrecision):undefined;if(field==='on_hand')onHand=amount;else reserved=amount;}
      catch(error){issue(number,field,'QUANTITY',(error as Error).message);}
     }
     if(onHand!==undefined&&reserved!==undefined&&reserved>onHand)issue(number,'reserved','CONSERVATION','Reserved quantity exceeds on-hand');
     let observedAt='';const observed=row.observed_at!;
     if(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(observed)&&Number.isFinite(Date.parse(observed))) {
      observedAt=new Date(observed).toISOString();const canonical=observed.replace(/(?:\.(\d{1,3}))?Z$/,(_,fraction:string|undefined)=>'.'+(fraction??'').padEnd(3,'0')+'Z');
      if(canonical!==observedAt||Date.parse(observedAt)>Date.parse(generatedAt)+300000)observedAt='';
     }
     if(!observedAt)issue(number,'observed_at','TIMESTAMP','A valid observed UTC calendar time, no more than five minutes in the future, is required');
     if(issues.length===before&&sku&&facilityId&&skuId&&onHand!==undefined&&reserved!==undefined)records.push({row:number,recordId:row.record_id!,facilityRef:row.facility_ref!,skuRef:row.sku_ref!,facilityId,skuId,unit:sku.unit,quantityPrecision:sku.quantityPrecision,onHand:decimal(onHand,sku.quantityPrecision),reserved:decimal(reserved,sku.quantityPrecision),available:decimal(onHand-reserved,sku.quantityPrecision),observedAt});
    }
   }
   const document:ExchangeDocument={schemaVersion:1,source:'external',tenantId:actor.tenantId,id:this.runtime.id(),idempotencyKey:input.idempotencyKey,actorId:actor.actorId,kind:'import',state:issues.length?'rejected':'validated',resource:'stock-observations',sourceSystem:input.sourceSystem,externalId:input.externalId,fileName:input.fileName,generatedAt,contentSha256,totalRows:Math.max(0,rows.length-1),acceptedRows:issues.length?0:records.length,issues,records:issues.length?[]:records,csv:null,nextCursor:null,spreadsheetSafe:false,planningApproved:false};
   await this.save(tx,actor,document);return document;
  });
 }
 export(actor:Actor,input:ExportInput) {
  if(!['facilities','skus','stock'].includes(input.resource))throw new OperationalError(400,'Unsupported export resource');
  const page=pageInput(actor.tenantId,input.resource==='facilities'?'facilities':'catalog',input.limit,input.cursor);
  if(input.resource==='stock'){uuidInput(input.facilityId!);uuidInput(input.skuId!);if(input.cursor!==undefined||input.limit!==undefined)throw new OperationalError(400,'Stock export contains one selected stock key');}
  else if(input.facilityId!==undefined||input.skuId!==undefined)throw new OperationalError(400,'Stock scope is only valid for stock export');
  const fingerprint=this.digest.sha256(JSON.stringify(['export',input.resource,page,input.facilityId?.toLowerCase(),input.skuId?.toLowerCase(),input.sourceSystem,input.externalId]));
  return this.receipt<ExchangeDocument>(actor,'export',input,fingerprint,async tx=>{
   let rows:(string|number)[][],totalRows:number,nextCursor:string|null=null;
   if(input.resource==='stock'){
    const stock=await this.inventory.balanceIn(tx,actor,{facilityId:input.facilityId!,skuId:input.skuId!});
    rows=[['tenant_id','facility_id','sku_id','unit','quantity_precision','on_hand','reserved','available'],[actor.tenantId,stock.facilityId,stock.skuId,stock.unit,stock.quantityPrecision,stock.onHand,stock.reserved,stock.available]];totalRows=1;
   }else if(input.resource==='facilities'){
    const result=await this.facilities.listIn(tx,actor,page);nextCursor=result.nextCursor;totalRows=result.items.length;
    rows=[['tenant_id','id','code','name','kind','timezone','latitude_degrees','longitude_degrees','location_source','source_system','external_id'],...result.items.map(row=>[actor.tenantId,row.id,row.code,row.name,row.kind,row.timezone,row.latitude,row.longitude,row.locationSource,row.sourceSystem,row.externalId])];
   }else{
    const result=await this.catalog.listIn(tx,actor,page);nextCursor=result.nextCursor;totalRows=result.items.length;
    rows=[['tenant_id','id','code','name','unit','quantity_precision','source_system','external_id'],...result.items.map(row=>[actor.tenantId,row.id,row.code,row.name,row.unit,row.quantityPrecision,row.sourceSystem,row.externalId])];
   }
   const csv=csvDocument(rows),document:ExchangeDocument={schemaVersion:1,source:'operational',tenantId:actor.tenantId,id:this.runtime.id(),idempotencyKey:input.idempotencyKey,actorId:actor.actorId,kind:'export',state:'exported',resource:input.resource,sourceSystem:input.sourceSystem,externalId:input.externalId,fileName:`${input.resource}.csv`,generatedAt:this.runtime.now(),contentSha256:this.digest.sha256(csv),totalRows,acceptedRows:totalRows,issues:[],records:[],csv,nextCursor,spreadsheetSafe:true,planningApproved:false};
   await this.save(tx,actor,document);return document;
  });
 }
 private async save(tx:Transaction,actor:Actor,document:ExchangeDocument) {await this.repository.document(tx,actor,document);await this.audit.append(tx,actor,document.id,'exchange_document',document.sourceSystem,document.state,undefined,{domain:'integrations',key:document.idempotencyKey});}
 get(actor:Actor,id:string){uuidInput(id);return this.work.transaction(actor,async tx=>{const document=await this.repository.get(tx,actor,id);if(!document)throw new OperationalError(404,'Exchange document not found in this tenant');return document;});}
 list(actor:Actor,page:Page){return this.work.transaction(actor,async tx=>({schemaVersion:1 as const,source:'operational' as const,tenantId:actor.tenantId,generatedAt:this.runtime.now(),...await this.repository.list(tx,actor,page)}));}
 mappings(actor:Actor,page:Page){return this.work.transaction(actor,async tx=>({schemaVersion:1 as const,source:'operational' as const,tenantId:actor.tenantId,generatedAt:this.runtime.now(),...await this.repository.mappings(tx,actor,page)}));}
 snapshot(actor:Actor,input:SnapshotInput){
  this.operator(actor);sourceInput(input);
  if(input.schemaVersion!==undefined&&input.schemaVersion!==1)throw new OperationalError(400,'Use schema version 1');
  if(input.notes!==undefined&&(typeof input.notes!=='string'||input.notes.length>500))throw new OperationalError(400,'Notes must be at most 500 characters');
  const fingerprint=this.digest.sha256(JSON.stringify(['snapshot',input.schemaVersion??1,input.notes??'',input.sourceSystem,input.externalId]));
  return this.receipt<SnapshotManifest>(actor,'snapshot',input,fingerprint,async tx=>{
   const dataset=await this.repository.extract(tx,actor);
   const generatedAt=this.runtime.now(),approvedAt=generatedAt,snapshotId=this.runtime.id();
   const facilitiesCsv=csvDocument([['facility_id','code','name','kind','timezone','latitude','longitude','location_source','source_system','external_id'],...dataset.facilities.map(f=>[f.id,f.code,f.name,f.kind,f.timezone,f.latitude,f.longitude,f.locationSource,f.sourceSystem,f.externalId])]);
   const skusCsv=csvDocument([['sku_id','code','name','unit','quantity_precision','source_system','external_id'],...dataset.skus.map(s=>[s.id,s.code,s.name,s.unit,s.quantityPrecision,s.sourceSystem,s.externalId])]);
   const stockCsv=csvDocument([['facility_id','sku_id','unit','quantity_precision','on_hand','reserved','available'],...dataset.stock.map(s=>[s.facilityId,s.skuId,s.unit,s.quantityPrecision,s.onHand,s.reserved,s.available])]);
   const ordersCsv=csvDocument([['order_id','facility_id','customer_reference','state','source_system','external_id','line_id','sku_id','sku_code','sku_name','unit','quantity_precision','requested','allocated','shipped','created_at'],...dataset.orders.map(o=>[o.orderId,o.facilityId,o.customerReference,o.state,o.sourceSystem,o.externalId,o.lineId,o.skuId,o.skuCode,o.skuName,o.unit,o.quantityPrecision,o.requested,o.allocated,o.shipped,o.createdAt])]);
   const artifactItems:SnapshotArtifact[]=[
    {name:'facilities.csv',fileName:'facilities.csv',mediaType:'text/csv',contentSha256:this.digest.sha256(facilitiesCsv),rowCount:dataset.facilities.length,byteSize:Buffer.byteLength(facilitiesCsv,'utf8'),content:facilitiesCsv},
    {name:'skus.csv',fileName:'skus.csv',mediaType:'text/csv',contentSha256:this.digest.sha256(skusCsv),rowCount:dataset.skus.length,byteSize:Buffer.byteLength(skusCsv,'utf8'),content:skusCsv},
    {name:'stock.csv',fileName:'stock.csv',mediaType:'text/csv',contentSha256:this.digest.sha256(stockCsv),rowCount:dataset.stock.length,byteSize:Buffer.byteLength(stockCsv,'utf8'),content:stockCsv},
    {name:'orders.csv',fileName:'orders.csv',mediaType:'text/csv',contentSha256:this.digest.sha256(ordersCsv),rowCount:dataset.orders.length,byteSize:Buffer.byteLength(ordersCsv,'utf8'),content:ordersCsv}
   ];
   const contentSha256=this.digest.sha256(artifactItems.map(a=>`${a.name}:${a.contentSha256}`).sort().join(';'));
   const artifacts:SnapshotArtifactSummary[]=artifactItems.map(a=>({name:a.name,fileName:a.fileName,mediaType:a.mediaType,contentSha256:a.contentSha256,rowCount:a.rowCount,byteSize:a.byteSize}));
   const partial={schemaVersion:1 as const,manifestVersion:1 as const,source:'operational' as const,tenantId:actor.tenantId,id:snapshotId,idempotencyKey:input.idempotencyKey,actorId:actor.actorId,sourceSystem:input.sourceSystem,externalId:input.externalId,generatedAt,approvedAt,approval:{approvedBy:actor.actorId,approvedAt,...(input.notes?{notes:input.notes}:{})},planningApproved:true as const,contentSha256,artifacts,lineage:{generatedAt,cutoffAt:generatedAt,tenantId:actor.tenantId,actorId:actor.actorId,sourceSystem:input.sourceSystem,externalId:input.externalId}};
   const manifestSha256=this.digest.sha256(JSON.stringify(partial));
   const manifest:SnapshotManifest={...partial,manifestSha256};
   const manifestJson=JSON.stringify(manifest,null,2);
   const manifestArtifact:SnapshotArtifact={name:'manifest.json',fileName:'manifest.json',mediaType:'application/json',contentSha256:this.digest.sha256(manifestJson),rowCount:1,byteSize:Buffer.byteLength(manifestJson,'utf8'),content:manifestJson};
   await this.repository.saveSnapshot(tx,actor,manifest,[...artifactItems,manifestArtifact]);
   await this.audit.append(tx,actor,manifest.id,'planning_snapshot',input.sourceSystem,'snapshot_approved',undefined,{domain:'integrations',key:input.idempotencyKey});
   return manifest;
  });
 }
 getSnapshot(actor:Actor,id:string){uuidInput(id);return this.work.transaction(actor,async tx=>{const manifest=await this.repository.getSnapshot(tx,actor,id);if(!manifest)throw new OperationalError(404,'Planning snapshot not found in this tenant');return manifest;});}
 getArtifact(actor:Actor,snapshotId:string,name:string){uuidInput(snapshotId);this.identifier(name);return this.work.transaction(actor,async tx=>{const artifact=await this.repository.getArtifact(tx,actor,snapshotId,name);if(!artifact)throw new OperationalError(404,'Snapshot artifact not found in this tenant');return artifact;});}
 listSnapshots(actor:Actor,page:Page){return this.work.transaction(actor,async tx=>({schemaVersion:1 as const,source:'operational' as const,tenantId:actor.tenantId,generatedAt:this.runtime.now(),...await this.repository.listSnapshots(tx,actor,page)}));}
}

