import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ShippingService, shippingResource, pageInput } from '@supply-chain/operations';
import { AuthorizedRequest, TenantGuard } from '../identity/guard';
import { ErrorDto, ErrorMessageDto } from '../../transport/http/responses';
import { OrderPageQueryDto } from '../fulfillment/dto';
import { ShipmentInputDto, ShipmentTransitionDto, DeliveryInputDto, ShippingResultDto, ShipmentPageDto } from './dto';
@ApiTags('shipping') @ApiBearerAuth() @ApiExtraModels(ErrorMessageDto)
@ApiResponse({status:400,type:ErrorDto}) @ApiResponse({status:401,type:ErrorDto}) @ApiResponse({status:403,type:ErrorDto}) @ApiResponse({status:404,type:ErrorDto}) @ApiResponse({status:409,type:ErrorDto}) @ApiResponse({status:503,type:ErrorDto})
@Controller('api/v1/shipping') @UseGuards(TenantGuard)
export class ShippingController {
 constructor(private readonly service:ShippingService) {}
 @Get('shipments') @ApiResponse({status:200,type:ShipmentPageDto})
 list(@Req() req:AuthorizedRequest,@Query() query:OrderPageQueryDto) {return this.service.list(req.actor,query.orderId,pageInput(req.actor.tenantId,shippingResource(query.orderId),query.limit,query.cursor));}
 @Post('create') @ApiResponse({status:201,type:ShippingResultDto})
 create(@Req() req:AuthorizedRequest,@Body() input:ShipmentInputDto) {return this.service.command(req.actor,'create',input);}
 @Post('dispatch') @ApiResponse({status:201,type:ShippingResultDto})
 dispatch(@Req() req:AuthorizedRequest,@Body() input:ShipmentTransitionDto) {return this.service.command(req.actor,'dispatch',input);}
 @Post('cancel') @ApiResponse({status:201,type:ShippingResultDto})
 cancel(@Req() req:AuthorizedRequest,@Body() input:ShipmentTransitionDto) {return this.service.command(req.actor,'cancel',input);}
 @Post('deliver') @ApiResponse({status:201,type:ShippingResultDto})
 deliver(@Req() req:AuthorizedRequest,@Body() input:DeliveryInputDto) {return this.service.command(req.actor,'deliver',input);}
}
