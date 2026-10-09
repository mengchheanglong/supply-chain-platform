import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsOptional, IsString, IsUUID, Length, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { InventorySourceDto, OperationalDto } from '../inventory/dto';
export class DemandLineDto {
 @ApiProperty({format:'uuid'}) @IsUUID() skuId!:string;
 @ApiProperty({type:String,pattern:'^(0|[1-9][0-9]{0,11})(\\.[0-9]{1,6})?$'}) @IsString() @Matches(/^(0|[1-9][0-9]{0,11})(\.[0-9]{1,6})?$/) quantity!:string;
 @ApiProperty({enum:['each','kg','m3','litre']}) @IsIn(['each','kg','m3','litre']) unit!:'each'|'kg'|'m3'|'litre';
}
export class OrderInputDto extends InventorySourceDto {
 @ApiProperty({format:'uuid'}) @IsUUID() facilityId!:string;
 @ApiProperty({maxLength:160,description:'Opaque customer reference; no pricing or personal data required'}) @IsString() @Length(1,160) @Matches(/^\S(?:.*\S)?$/) customerReference!:string;
 @ApiProperty({type:[DemandLineDto],minItems:1,maxItems:50}) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({each:true}) @Type(()=>DemandLineDto) lines!:DemandLineDto[];
}
export class OrderScopeDto { @ApiProperty({format:'uuid'}) @IsUUID() orderId!:string; }
export class WorkflowPageQueryDto {
 @ApiPropertyOptional({type:String,description:'1–200; default 50'}) @IsOptional() @IsString() @Matches(/^[0-9]+$/) limit?:string;
 @ApiPropertyOptional({type:String,maxLength:1024}) @IsOptional() @IsString() @Length(1,1024) cursor?:string;
}
export class OrderPageQueryDto extends WorkflowPageQueryDto { @ApiProperty({format:'uuid'}) @IsUUID() orderId!:string; }
export class AllocateInputDto extends InventorySourceDto {
 @ApiProperty({format:'uuid'}) @IsUUID() orderId!:string;
 @ApiProperty({format:'uuid'}) @IsUUID() lineId!:string;
 @ApiProperty({type:String,pattern:'^(0|[1-9][0-9]{0,11})(\\.[0-9]{1,6})?$'}) @IsString() @Matches(/^(0|[1-9][0-9]{0,11})(\.[0-9]{1,6})?$/) quantity!:string;
}
export class AllocationInputDto extends InventorySourceDto { @ApiProperty({format:'uuid'}) @IsUUID() allocationId!:string; }
export class CancelOrderInputDto extends InventorySourceDto { @ApiProperty({format:'uuid'}) @IsUUID() orderId!:string; }
export class OrderDto {
 @ApiProperty({format:'uuid'}) id!:string;
 @ApiProperty({format:'uuid'}) tenantId!:string;
 @ApiProperty({format:'uuid'}) facilityId!:string;
 @ApiProperty({type:String}) customerReference!:string;
 @ApiProperty({enum:['open','partially_shipped','fulfilled','cancelled']}) state!:'open'|'partially_shipped'|'fulfilled'|'cancelled';
 @ApiProperty({type:String}) sourceSystem!:string;
 @ApiProperty({type:String}) externalId!:string;
 @ApiProperty({format:'date-time'}) createdAt!:string;
 @ApiProperty({format:'date-time'}) updatedAt!:string;
}
export class OrderLineDto {
 @ApiProperty({type:String}) skuCode!:string;
 @ApiProperty({type:String}) skuName!:string;
 @ApiProperty({format:'uuid'}) id!:string;
 @ApiProperty({format:'uuid'}) orderId!:string;
 @ApiProperty({format:'uuid'}) skuId!:string;
 @ApiProperty({enum:['each','kg','m3','litre']}) unit!:'each'|'kg'|'m3'|'litre';
 @ApiProperty({type:'integer',minimum:0,maximum:6}) quantityPrecision!:number;
 @ApiProperty({type:String}) requested!:string;
 @ApiProperty({type:String}) allocated!:string;
 @ApiProperty({type:String}) shipped!:string;
 @ApiProperty({type:String}) remaining!:string;
}
export class AllocationDto {
 @ApiProperty({enum:['each','kg','m3','litre']}) unit!:'each'|'kg'|'m3'|'litre';
 @ApiProperty({type:'integer',minimum:0,maximum:6}) quantityPrecision!:number;
 @ApiProperty({format:'uuid'}) id!:string;
 @ApiProperty({format:'uuid'}) tenantId!:string;
 @ApiProperty({format:'uuid'}) orderId!:string;
 @ApiProperty({format:'uuid'}) lineId!:string;
 @ApiProperty({format:'uuid'}) reservationId!:string;
 @ApiProperty({type:String}) quantity!:string;
 @ApiProperty({enum:['allocated','picked','packed','shipped','cancelled']}) state!:'allocated'|'picked'|'packed'|'shipped'|'cancelled';
 @ApiProperty({type:String,format:'uuid',nullable:true}) shipmentId!:string|null;
 @ApiProperty({format:'date-time'}) createdAt!:string;
 @ApiProperty({format:'date-time'}) updatedAt!:string;
}
export class FulfillmentResultDto extends OperationalDto {
 @ApiProperty({format:'uuid'}) idempotencyKey!:string;
 @ApiProperty({enum:['order','allocate','pick','pack','cancel-allocation','cancel-order']}) action!:string;
 @ApiProperty({format:'uuid'}) orderId!:string;
 @ApiProperty({type:String,format:'uuid',nullable:true}) allocationId!:string|null;
}
export class OrderDetailDto extends OperationalDto {
 @ApiProperty({format:'date-time'}) generatedAt!:string;
 @ApiProperty({type:OrderDto}) order!:OrderDto;
 @ApiProperty({type:[OrderLineDto]}) lines!:OrderLineDto[];
}
export class OrderPageDto extends OperationalDto {
 @ApiProperty({format:'date-time'}) generatedAt!:string;
 @ApiProperty({type:[OrderDto]}) items!:OrderDto[];
 @ApiProperty({type:String,nullable:true}) nextCursor!:string|null;
}
export class AllocationPageDto extends OperationalDto {
 @ApiProperty({format:'date-time'}) generatedAt!:string;
 @ApiProperty({type:[AllocationDto]}) items!:AllocationDto[];
 @ApiProperty({type:String,nullable:true}) nextCursor!:string|null;
}
