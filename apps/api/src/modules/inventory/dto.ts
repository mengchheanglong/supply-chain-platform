import { IsIn, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class StockScopeDto {
  @ApiProperty({format:'uuid'}) @IsUUID() facilityId!: string;
  @ApiProperty({format:'uuid'}) @IsUUID() skuId!: string;
}
export class InventoryListQueryDto extends StockScopeDto {
  @ApiPropertyOptional({type:String,pattern:'^[0-9]+$',description:'1–200; default 50'}) @IsOptional() @IsString() @Matches(/^[0-9]+$/) limit?: string;
  @ApiPropertyOptional({type:String,maxLength:1024}) @IsOptional() @IsString() @Length(1,1024) cursor?: string;
}
export class InventorySourceDto {
  @ApiProperty({format:'uuid',description:'Retain this key and identical input when retrying an unconfirmed command'}) @IsUUID() idempotencyKey!: string;
  @ApiProperty({minLength:1,maxLength:80,pattern:'^[A-Za-z0-9_.-]+$'}) @IsString() @Length(1,80) @Matches(/^[A-Za-z0-9_.-]+$/) sourceSystem!: string;
  @ApiProperty({minLength:1,maxLength:160,description:'Source event/document identity, unique per tenant and action'}) @IsString() @Length(1,160) @Matches(/^\S(?:.*\S)?$/) externalId!: string;
}
export class StockCommandDto extends InventorySourceDto {
  @ApiProperty({format:'uuid'}) @IsUUID() facilityId!: string;
  @ApiProperty({format:'uuid'}) @IsUUID() skuId!: string;
  @ApiProperty({type:String,pattern:'^(0|[1-9][0-9]{0,11})(\\.[0-9]{1,6})?$',example:'12.500',description:'Positive decimal string; must fit SKU precision. No implicit unit conversion.'}) @IsString() @Matches(/^(0|[1-9][0-9]{0,11})(\.[0-9]{1,6})?$/) quantity!: string;
  @ApiProperty({enum:['each','kg','m3','litre']}) @IsIn(['each','kg','m3','litre']) unit!: 'each' | 'kg' | 'm3' | 'litre';
}
export class ReservationCommandDto extends InventorySourceDto {
  @ApiProperty({format:'uuid'}) @IsUUID() reservationId!: string;
}
export class StockDto extends StockScopeDto {
  @ApiProperty({format:'uuid'}) tenantId!: string;
  @ApiProperty({enum:['each','kg','m3','litre']}) unit!: string;
  @ApiProperty({type:'integer',minimum:0,maximum:6}) quantityPrecision!: number;
  @ApiProperty({type:String}) onHand!: string;
  @ApiProperty({type:String}) reserved!: string;
  @ApiProperty({type:String}) available!: string;
}
export class OperationalDto {
  @ApiProperty({type:Number,enum:[1]}) schemaVersion!: 1;
  @ApiProperty({enum:['operational']}) source!: 'operational';
  @ApiProperty({format:'uuid'}) tenantId!: string;
}
export class BalanceDto extends OperationalDto {
  @ApiProperty({format:'date-time'}) generatedAt!: string;
  @ApiProperty({type:StockDto}) stock!: StockDto;
}
export class InventoryCommandResultDto extends OperationalDto {
  @ApiProperty({format:'uuid'}) idempotencyKey!: string;
  @ApiProperty({enum:['receive','reserve','release','ship']}) action!: string;
  @ApiProperty({type:StockDto}) stock!: StockDto;
  @ApiProperty({type:String,format:'uuid',nullable:true}) reservationId!: string | null;
  @ApiProperty({type:String,format:'uuid',nullable:true}) movementId!: string | null;
}
export class ReservationDto extends StockScopeDto {
  @ApiProperty({type:String,enum:['fulfillment'],nullable:true}) ownerType!: string | null;
  @ApiProperty({type:String,format:'uuid',nullable:true}) ownerId!: string | null;
  @ApiProperty({format:'uuid'}) id!: string;
  @ApiProperty({format:'uuid'}) tenantId!: string;
  @ApiProperty({type:String}) quantity!: string;
  @ApiProperty({enum:['active','released','consumed']}) state!: string;
  @ApiProperty({type:String}) sourceSystem!: string;
  @ApiProperty({type:String}) externalId!: string;
  @ApiProperty({format:'uuid'}) actorId!: string;
  @ApiProperty({format:'uuid'}) idempotencyKey!: string;
  @ApiProperty({format:'date-time'}) createdAt!: string;
  @ApiProperty({format:'date-time'}) updatedAt!: string;
  @ApiProperty({enum:['each','kg','m3','litre']}) unit!: string;
  @ApiProperty({type:'integer',minimum:0,maximum:6}) quantityPrecision!: number;
}
export class MovementDto extends StockScopeDto {
  @ApiProperty({format:'uuid'}) id!: string;
  @ApiProperty({format:'uuid'}) tenantId!: string;
  @ApiProperty({type:String,description:'Signed physical stock change'}) delta!: string;
  @ApiProperty({enum:['receive','ship']}) action!: string;
  @ApiProperty({type:String,format:'uuid',nullable:true}) reservationId!: string | null;
  @ApiProperty({type:String}) sourceSystem!: string;
  @ApiProperty({type:String}) externalId!: string;
  @ApiProperty({format:'uuid'}) actorId!: string;
  @ApiProperty({format:'uuid'}) idempotencyKey!: string;
  @ApiProperty({format:'date-time'}) createdAt!: string;
  @ApiProperty({enum:['each','kg','m3','litre']}) unit!: string;
  @ApiProperty({type:'integer',minimum:0,maximum:6}) quantityPrecision!: number;
}
export class ReservationPageDto extends OperationalDto {
  @ApiProperty({format:'date-time'}) generatedAt!: string;
  @ApiProperty({type:[ReservationDto]}) items!: ReservationDto[];
  @ApiProperty({type:String,nullable:true}) nextCursor!: string | null;
}
export class MovementPageDto extends OperationalDto {
  @ApiProperty({format:'date-time'}) generatedAt!: string;
  @ApiProperty({type:[MovementDto]}) items!: MovementDto[];
  @ApiProperty({type:String,nullable:true}) nextCursor!: string | null;
}
export class ReconciliationDto extends OperationalDto {
  @ApiProperty({format:'date-time'}) generatedAt!: string;
  @ApiProperty({format:'uuid'}) facilityId!: string;
  @ApiProperty({format:'uuid'}) skuId!: string;
  @ApiProperty({enum:['each','kg','m3','litre']}) unit!: string;
  @ApiProperty({type:'integer',minimum:0,maximum:6}) quantityPrecision!: number;
  @ApiProperty({type:String}) onHand!: string;
  @ApiProperty({type:String}) reserved!: string;
  @ApiProperty({type:String}) ledgerOnHand!: string;
  @ApiProperty({type:String}) activeReserved!: string;
  @ApiProperty({type:Boolean}) consistent!: boolean;
}
