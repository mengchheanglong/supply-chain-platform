import { ApiProperty } from '@nestjs/swagger';
import { CreateFacilityDto } from '../../modules/facilities/dto';
import { CreateSkuDto } from '../../modules/catalog/dto';
export class CreatedDto { schemaVersion!: 1; source!: 'operational'; tenantId!: string; id!: string }
export class FacilityDto extends CreateFacilityDto { id!: string; tenantId!: string; createdAt!: string }
export class SkuDto extends CreateSkuDto { id!: string; tenantId!: string; createdAt!: string }
export class FacilityPageDto { schemaVersion!: 1; source!: 'operational'; tenantId!: string; generatedAt!: string; items!: FacilityDto[]; nextCursor!: string | null }
export class SkuPageDto { schemaVersion!: 1; source!: 'operational'; tenantId!: string; generatedAt!: string; items!: SkuDto[]; nextCursor!: string | null }
export class ContextDto { schemaVersion!: 1; tenantId!: string; tenantName!: string; timezone!: string; actorId!: string; role!: 'operator' | 'reader' }
export class ChecksDto { database!: boolean; postgis!: boolean; migrations!: boolean; restrictedRole!: boolean }
export class ReadinessDto { schemaVersion!: 1; status!: 'ready' | 'unavailable'; checks!: ChecksDto }
export class LivenessDto { schemaVersion!: 1; status!: 'alive' }
export class ErrorMessageDto { message!: string | string[]; error?: string; statusCode?: number }
export class ErrorDto { schemaVersion!: 1; statusCode!: number; error!: string | ErrorMessageDto; correlationId!: string }
for (const model of [CreatedDto,FacilityPageDto,SkuPageDto,ContextDto,ReadinessDto,LivenessDto,ErrorDto]) ApiProperty({ type: Number, enum: [1] })(model.prototype,'schemaVersion');
for (const model of [CreatedDto,FacilityPageDto,SkuPageDto]) ApiProperty({ enum: ['operational'] })(model.prototype,'source');
for (const model of [CreatedDto,FacilityDto,SkuDto,FacilityPageDto,SkuPageDto,ContextDto]) ApiProperty({ type: String, format: 'uuid' })(model.prototype,'tenantId');
for (const model of [CreatedDto,FacilityDto,SkuDto]) ApiProperty({ type: String, format: 'uuid' })(model.prototype,'id');
for (const model of [FacilityDto,SkuDto]) ApiProperty({ type: String, format: 'date-time' })(model.prototype,'createdAt');
for (const model of [FacilityPageDto,SkuPageDto]) {
  ApiProperty({ type: String, format: 'date-time' })(model.prototype,'generatedAt');
  ApiProperty({ type: String, nullable: true })(model.prototype,'nextCursor');
}
ApiProperty({ type: [FacilityDto] })(FacilityPageDto.prototype,'items');
ApiProperty({ type: [SkuDto] })(SkuPageDto.prototype,'items');
for (const key of ['tenantName','timezone','actorId']) ApiProperty({ type: String })(ContextDto.prototype,key);
ApiProperty({ enum: ['operator','reader'] })(ContextDto.prototype,'role');
ApiProperty({ enum: ['ready','unavailable'] })(ReadinessDto.prototype,'status');
ApiProperty({ type: ChecksDto })(ReadinessDto.prototype,'checks');
for (const key of ['database','postgis','migrations','restrictedRole']) ApiProperty({ type: Boolean })(ChecksDto.prototype,key);
ApiProperty({ enum: ['alive'] })(LivenessDto.prototype,'status');
ApiProperty({ type: Number })(ErrorDto.prototype,'statusCode');
ApiProperty({ type: String, format: 'uuid' })(ErrorDto.prototype,'correlationId');
ApiProperty({ type: Object, oneOf: [{type:'string'},{'$ref':'#/components/schemas/ErrorMessageDto'}] })(ErrorDto.prototype,'error');
ApiProperty({ type: Object, oneOf: [{type:'string'},{type:'array',items:{type:'string'}}] })(ErrorMessageDto.prototype,'message');
ApiProperty({ type:String, required:false })(ErrorMessageDto.prototype,'error');
ApiProperty({ type:Number, required:false })(ErrorMessageDto.prototype,'statusCode');
