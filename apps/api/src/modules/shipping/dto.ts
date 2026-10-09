import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Matches } from 'class-validator';
import { InventorySourceDto, OperationalDto } from '../inventory/dto';
export class ShipmentInputDto extends InventorySourceDto { @ApiProperty({format:'uuid'}) @IsUUID() allocationId!:string; }
export class ShipmentTransitionDto extends InventorySourceDto { @ApiProperty({format:'uuid'}) @IsUUID() shipmentId!:string; }
export class DeliveryInputDto extends ShipmentTransitionDto {
 @ApiProperty({format:'date-time',description:'Observed UTC delivery time; externalId identifies delivery evidence'}) @IsString() @Matches(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/) observedAt!:string;
}
export class ShipmentDto {
 @ApiProperty({format:'uuid'}) id!:string;
 @ApiProperty({format:'uuid'}) tenantId!:string;
 @ApiProperty({format:'uuid'}) orderId!:string;
 @ApiProperty({format:'uuid'}) allocationId!:string;
 @ApiProperty({enum:['draft','dispatched','delivered','cancelled']}) state!:'draft'|'dispatched'|'delivered'|'cancelled';
 @ApiProperty({type:String}) sourceSystem!:string;
 @ApiProperty({type:String}) externalId!:string;
 @ApiProperty({format:'date-time'}) createdAt!:string;
 @ApiProperty({format:'date-time'}) updatedAt!:string;
 @ApiProperty({type:String,format:'date-time',nullable:true}) dispatchedAt!:string|null;
 @ApiProperty({type:String,format:'date-time',nullable:true}) deliveredAt!:string|null;
 @ApiProperty({type:String,nullable:true}) deliverySource!:string|null;
 @ApiProperty({type:String,nullable:true}) deliveryReference!:string|null;
}
export class ShippingResultDto extends OperationalDto {
 @ApiProperty({format:'uuid'}) idempotencyKey!:string;
 @ApiProperty({enum:['create','dispatch','deliver','cancel']}) action!:string;
 @ApiProperty({format:'uuid'}) shipmentId!:string;
 @ApiProperty({format:'uuid'}) orderId!:string;
 @ApiProperty({enum:['draft','dispatched','delivered','cancelled']}) state!:'draft'|'dispatched'|'delivered'|'cancelled';
 @ApiProperty({type:String,format:'uuid',nullable:true}) movementId!:string|null;
}
export class ShipmentPageDto extends OperationalDto {
 @ApiProperty({format:'date-time'}) generatedAt!:string;
 @ApiProperty({type:[ShipmentDto]}) items!:ShipmentDto[];
 @ApiProperty({type:String,nullable:true}) nextCursor!:string|null;
}
