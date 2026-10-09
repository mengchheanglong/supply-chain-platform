export interface ExchangeSource {idempotencyKey:string;sourceSystem:string;externalId:string}
export interface MappingInput extends ExchangeSource {entity:'facility'|'sku';sourceExternalId:string;targetId:string}
export interface Mapping {id:string;tenantId:string;entity:'facility'|'sku';sourceSystem:string;sourceExternalId:string;targetId:string;createdAt:string}
export interface ImportInput extends ExchangeSource {schemaVersion:1;fileName:string;csv:string}
export interface ExportInput extends ExchangeSource {resource:'facilities'|'skus'|'stock';limit?:string;cursor?:string;facilityId?:string;skuId?:string}
export interface QualityIssue {row:number;field:string;code:string;message:string}
export interface StagedStock {row:number;recordId:string;facilityRef:string;skuRef:string;facilityId:string;skuId:string;unit:'each'|'kg'|'m3'|'litre';quantityPrecision:number;onHand:string;reserved:string;available:string;observedAt:string}
export interface ExchangeDocument {
 schemaVersion:1;source:'external'|'operational';tenantId:string;id:string;idempotencyKey:string;actorId:string;
 kind:'import'|'export';state:'validated'|'rejected'|'exported';resource:'stock-observations'|'facilities'|'skus'|'stock';
 sourceSystem:string;externalId:string;fileName:string;generatedAt:string;contentSha256:string;
 totalRows:number;acceptedRows:number;issues:QualityIssue[];records:StagedStock[];csv:string|null;
 nextCursor:string|null;spreadsheetSafe:boolean;planningApproved:false;
}
export interface SnapshotInput extends ExchangeSource {schemaVersion?:1;notes?:string}
export interface SnapshotArtifact {name:string;fileName:string;mediaType:string;contentSha256:string;rowCount:number;byteSize:number;content:string}
export type SnapshotArtifactSummary = Omit<SnapshotArtifact,'content'>;
export interface SnapshotApproval {approvedBy:string;approvedAt:string;notes?:string}
export interface SnapshotLineage {generatedAt:string;cutoffAt:string;tenantId:string;actorId:string;sourceSystem:string;externalId:string}
export interface SnapshotManifest {
 schemaVersion:1;manifestVersion:1;source:'operational';tenantId:string;id:string;idempotencyKey:string;actorId:string;
 sourceSystem:string;externalId:string;generatedAt:string;approvedAt:string;approval:SnapshotApproval;
 planningApproved:true;manifestSha256:string;contentSha256:string;artifacts:SnapshotArtifactSummary[];lineage:SnapshotLineage;
}
export interface SnapshotSummary {
 id:string;sourceSystem:string;externalId:string;generatedAt:string;approvedAt:string;
 manifestSha256:string;contentSha256:string;planningApproved:true;artifactCount:number;
}
export interface MappingReceipt {schemaVersion:1;source:'operational';tenantId:string;idempotencyKey:string;mapping:Mapping}
export type ExchangeReceipt=MappingReceipt|ExchangeDocument|SnapshotManifest;
export type ExchangeAction='mapping'|'import'|'export'|'snapshot';
