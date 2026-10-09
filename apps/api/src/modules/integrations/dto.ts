import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { InventorySourceDto, OperationalDto } from '../inventory/dto';
export class MappingInputDto extends InventorySourceDto {
 @ApiProperty({enum:['facility','sku']}) @IsIn(['facility','sku']) entity!:'facility'|'sku';
 @ApiProperty({type:String,maxLength:160}) @IsString() @Length(1,160) sourceExternalId!:string;
 @ApiProperty({format:'uuid'}) @IsUUID() targetId!:string;
}
export class MappingDto {
 @ApiProperty({format:'uuid'}) id!:string;
 @ApiProperty({format:'uuid'}) tenantId!:string;
 @ApiProperty({enum:['facility','sku']}) entity!:'facility'|'sku';
 @ApiProperty({type:String}) sourceSystem!:string;
 @ApiProperty({type:String}) sourceExternalId!:string;
 @ApiProperty({format:'uuid'}) targetId!:string;
 @ApiProperty({format:'date-time'}) createdAt!:string;
}
export class MappingReceiptDto extends OperationalDto {
 @ApiProperty({format:'uuid'}) idempotencyKey!:string;
 @ApiProperty({type:MappingDto}) mapping!:MappingDto;
}
export class ImportInputDto extends InventorySourceDto {
 @ApiProperty({type:Number,enum:[1]}) @Equals(1) schemaVersion!:1;
 @ApiProperty({type:String,maxLength:160}) @IsString() @Length(1,160) fileName!:string;
 @ApiProperty({type:String,minLength:1,maxLength:40000,description:'Stock observation CSV v1; at most 200 records. Validation never changes operational stock.'}) @IsString() @Length(1,40000) csv!:string;
}
export class ExportInputDto extends InventorySourceDto {
 @ApiProperty({enum:['facilities','skus','stock']}) @IsIn(['facilities','skus','stock']) resource!:'facilities'|'skus'|'stock';
 @ApiPropertyOptional({type:String,description:'Master-data page size 1–200; default 50'}) @IsOptional() @IsString() limit?:string;
 @ApiPropertyOptional({type:String,maxLength:1024}) @IsOptional() @IsString() @Length(1,1024) cursor?:string;
 @ApiPropertyOptional({format:'uuid',description:'Required only for stock export'}) @IsOptional() @IsUUID() facilityId?:string;
 @ApiPropertyOptional({format:'uuid',description:'Required only for stock export'}) @IsOptional() @IsUUID() skuId?:string;
}
export class QualityIssueDto {
 @ApiProperty({type:'integer',minimum:1}) row!:number;
 @ApiProperty({type:String}) field!:string;
 @ApiProperty({type:String}) code!:string;
 @ApiProperty({type:String}) message!:string;
}
export class StagedStockDto {
 @ApiProperty({type:'integer'}) row!:number;
 @ApiProperty({type:String}) recordId!:string;
 @ApiProperty({type:String}) facilityRef!:string;
 @ApiProperty({type:String}) skuRef!:string;
 @ApiProperty({format:'uuid'}) facilityId!:string;
 @ApiProperty({format:'uuid'}) skuId!:string;
 @ApiProperty({enum:['each','kg','m3','litre']}) unit!:'each'|'kg'|'m3'|'litre';
 @ApiProperty({type:'integer',minimum:0,maximum:6}) quantityPrecision!:number;
 @ApiProperty({type:String}) onHand!:string;
 @ApiProperty({type:String}) reserved!:string;
 @ApiProperty({type:String}) available!:string;
 @ApiProperty({format:'date-time'}) observedAt!:string;
}
export class ExchangeDocumentDto {
 @ApiProperty({type:Number,enum:[1]}) schemaVersion!:1;
 @ApiProperty({enum:['external','operational']}) source!:'external'|'operational';
 @ApiProperty({format:'uuid'}) tenantId!:string;
 @ApiProperty({format:'uuid'}) id!:string;
 @ApiProperty({format:'uuid'}) idempotencyKey!:string;
 @ApiProperty({format:'uuid'}) actorId!:string;
 @ApiProperty({enum:['import','export']}) kind!:'import'|'export';
 @ApiProperty({enum:['validated','rejected','exported']}) state!:'validated'|'rejected'|'exported';
 @ApiProperty({enum:['stock-observations','facilities','skus','stock']}) resource!:'stock-observations'|'facilities'|'skus'|'stock';
 @ApiProperty({type:String}) sourceSystem!:string;
 @ApiProperty({type:String}) externalId!:string;
 @ApiProperty({type:String}) fileName!:string;
 @ApiProperty({format:'date-time'}) generatedAt!:string;
 @ApiProperty({type:String,pattern:'^[a-f0-9]{64}$'}) contentSha256!:string;
 @ApiProperty({type:'integer'}) totalRows!:number;
 @ApiProperty({type:'integer'}) acceptedRows!:number;
 @ApiProperty({type:[QualityIssueDto]}) issues!:QualityIssueDto[];
 @ApiProperty({type:[StagedStockDto]}) records!:StagedStockDto[];
 @ApiProperty({type:String,nullable:true}) csv!:string|null;
 @ApiProperty({type:String,nullable:true}) nextCursor!:string|null;
 @ApiProperty({type:Boolean}) spreadsheetSafe!:boolean;
 @ApiProperty({type:Boolean,enum:[false]}) planningApproved!:false;
}
export class DocumentSummaryDto {
 @ApiProperty({format:'uuid'}) id!:string;
 @ApiProperty({enum:['import','export']}) kind!:string;
 @ApiProperty({enum:['validated','rejected','exported']}) state!:string;
 @ApiProperty({type:String}) sourceSystem!:string;
 @ApiProperty({type:String}) externalId!:string;
 @ApiProperty({format:'date-time'}) generatedAt!:string;
 @ApiProperty({type:'integer'}) totalRows!:number;
 @ApiProperty({type:'integer'}) acceptedRows!:number;
}
export class MappingPageDto extends OperationalDto {
 @ApiProperty({format:'date-time'}) generatedAt!:string;
 @ApiProperty({type:[MappingDto]}) items!:MappingDto[];
 @ApiProperty({type:String,nullable:true}) nextCursor!:string|null;
}
export class DocumentPageDto extends OperationalDto {
 @ApiProperty({format:'date-time'}) generatedAt!:string;
 @ApiProperty({type:[DocumentSummaryDto]}) items!:DocumentSummaryDto[];
 @ApiProperty({type:String,nullable:true}) nextCursor!:string|null;
}
export class DocumentScopeDto { @ApiProperty({format:'uuid'}) @IsUUID() id!:string; }
export class SnapshotInputDto extends InventorySourceDto {
 @ApiPropertyOptional({type:Number,enum:[1]}) @IsOptional() @Equals(1) schemaVersion?:1;
 @ApiPropertyOptional({type:String,maxLength:500}) @IsOptional() @IsString() @Length(0,500) notes?:string;
}
export class SnapshotApprovalDto {
 @ApiProperty({format:'uuid'}) approvedBy!:string;
 @ApiProperty({format:'date-time'}) approvedAt!:string;
 @ApiPropertyOptional({type:String}) notes?:string;
}
export class SnapshotArtifactSummaryDto {
 @ApiProperty({type:String}) name!:string;
 @ApiProperty({type:String}) fileName!:string;
 @ApiProperty({type:String}) mediaType!:string;
 @ApiProperty({type:String,pattern:'^[a-f0-9]{64}$'}) contentSha256!:string;
 @ApiProperty({type:'integer'}) rowCount!:number;
 @ApiProperty({type:'integer'}) byteSize!:number;
}
export class SnapshotLineageDto {
 @ApiProperty({format:'date-time'}) generatedAt!:string;
 @ApiProperty({format:'date-time'}) cutoffAt!:string;
 @ApiProperty({format:'uuid'}) tenantId!:string;
 @ApiProperty({format:'uuid'}) actorId!:string;
 @ApiProperty({type:String}) sourceSystem!:string;
 @ApiProperty({type:String}) externalId!:string;
}
export class SnapshotManifestDto {
 @ApiProperty({type:Number,enum:[1]}) schemaVersion!:1;
 @ApiProperty({type:Number,enum:[1]}) manifestVersion!:1;
 @ApiProperty({enum:['operational']}) source!:'operational';
 @ApiProperty({format:'uuid'}) tenantId!:string;
 @ApiProperty({format:'uuid'}) id!:string;
 @ApiProperty({format:'uuid'}) idempotencyKey!:string;
 @ApiProperty({format:'uuid'}) actorId!:string;
 @ApiProperty({type:String}) sourceSystem!:string;
 @ApiProperty({type:String}) externalId!:string;
 @ApiProperty({format:'date-time'}) generatedAt!:string;
 @ApiProperty({format:'date-time'}) approvedAt!:string;
 @ApiProperty({type:SnapshotApprovalDto}) approval!:SnapshotApprovalDto;
 @ApiProperty({type:Boolean,enum:[true]}) planningApproved!:true;
 @ApiProperty({type:String,pattern:'^[a-f0-9]{64}$'}) manifestSha256!:string;
 @ApiProperty({type:String,pattern:'^[a-f0-9]{64}$'}) contentSha256!:string;
 @ApiProperty({type:[SnapshotArtifactSummaryDto]}) artifacts!:SnapshotArtifactSummaryDto[];
 @ApiProperty({type:SnapshotLineageDto}) lineage!:SnapshotLineageDto;
}
export class SnapshotSummaryDto {
 @ApiProperty({format:'uuid'}) id!:string;
 @ApiProperty({type:String}) sourceSystem!:string;
 @ApiProperty({type:String}) externalId!:string;
 @ApiProperty({format:'date-time'}) generatedAt!:string;
 @ApiProperty({format:'date-time'}) approvedAt!:string;
 @ApiProperty({type:String,pattern:'^[a-f0-9]{64}$'}) manifestSha256!:string;
 @ApiProperty({type:String,pattern:'^[a-f0-9]{64}$'}) contentSha256!:string;
 @ApiProperty({type:Boolean,enum:[true]}) planningApproved!:true;
 @ApiProperty({type:'integer'}) artifactCount!:number;
}
export class SnapshotPageDto extends OperationalDto {
 @ApiProperty({format:'date-time'}) generatedAt!:string;
 @ApiProperty({type:[SnapshotSummaryDto]}) items!:SnapshotSummaryDto[];
 @ApiProperty({type:String,nullable:true}) nextCursor!:string|null;
}
export class ArtifactScopeDto {
 @ApiProperty({format:'uuid'}) @IsUUID() id!:string;
 @ApiProperty({type:String}) @IsString() @Length(1,64) name!:string;
}
export class SnapshotArtifactDto {
 @ApiProperty({type:String}) name!:string;
 @ApiProperty({type:String}) fileName!:string;
 @ApiProperty({type:String}) mediaType!:string;
 @ApiProperty({type:String,pattern:'^[a-f0-9]{64}$'}) contentSha256!:string;
 @ApiProperty({type:'integer'}) rowCount!:number;
 @ApiProperty({type:'integer'}) byteSize!:number;
 @ApiProperty({type:String}) content!:string;
}
