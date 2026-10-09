import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FulfillmentService, fulfillmentResource, pageInput } from '@supply-chain/operations';
import { AuthorizedRequest, TenantGuard } from '../identity/guard';
import { ErrorDto, ErrorMessageDto } from '../../transport/http/responses';
import { OrderInputDto, AllocateInputDto, AllocationInputDto, CancelOrderInputDto, WorkflowPageQueryDto, OrderPageQueryDto, OrderScopeDto, FulfillmentResultDto, OrderDetailDto, OrderPageDto, AllocationPageDto } from './dto';
@ApiTags('fulfillment') @ApiBearerAuth() @ApiExtraModels(ErrorMessageDto)
@ApiResponse({status:400,type:ErrorDto}) @ApiResponse({status:401,type:ErrorDto}) @ApiResponse({status:403,type:ErrorDto}) @ApiResponse({status:404,type:ErrorDto}) @ApiResponse({status:409,type:ErrorDto}) @ApiResponse({status:503,type:ErrorDto})
@Controller('api/v1/fulfillment') @UseGuards(TenantGuard)
export class FulfillmentController {
 constructor(private readonly service:FulfillmentService) {}
 @Get('orders') @ApiResponse({status:200,type:OrderPageDto})
 list(@Req() req:AuthorizedRequest,@Query() query:WorkflowPageQueryDto) {return this.service.list(req.actor,pageInput(req.actor.tenantId,fulfillmentResource('orders'),query.limit,query.cursor));}
 @Get('order') @ApiResponse({status:200,type:OrderDetailDto})
 detail(@Req() req:AuthorizedRequest,@Query() query:OrderScopeDto) {return this.service.detail(req.actor,query.orderId);}
 @Get('allocations') @ApiResponse({status:200,type:AllocationPageDto})
 allocations(@Req() req:AuthorizedRequest,@Query() query:OrderPageQueryDto) {return this.service.allocations(req.actor,query.orderId,pageInput(req.actor.tenantId,fulfillmentResource('allocations',query.orderId),query.limit,query.cursor));}
 @Post('orders') @ApiResponse({status:201,type:FulfillmentResultDto})
 order(@Req() req:AuthorizedRequest,@Body() input:OrderInputDto) {return this.service.command(req.actor,'order',input);}
 @Post('allocate') @ApiResponse({status:201,type:FulfillmentResultDto})
 allocate(@Req() req:AuthorizedRequest,@Body() input:AllocateInputDto) {return this.service.command(req.actor,'allocate',input);}
 @Post('pick') @ApiResponse({status:201,type:FulfillmentResultDto})
 pick(@Req() req:AuthorizedRequest,@Body() input:AllocationInputDto) {return this.service.command(req.actor,'pick',input);}
 @Post('pack') @ApiResponse({status:201,type:FulfillmentResultDto})
 pack(@Req() req:AuthorizedRequest,@Body() input:AllocationInputDto) {return this.service.command(req.actor,'pack',input);}
 @Post('cancel-allocation') @ApiResponse({status:201,type:FulfillmentResultDto})
 cancelAllocation(@Req() req:AuthorizedRequest,@Body() input:AllocationInputDto) {return this.service.command(req.actor,'cancel-allocation',input);}
 @Post('cancel-order') @ApiResponse({status:201,type:FulfillmentResultDto})
 cancelOrder(@Req() req:AuthorizedRequest,@Body() input:CancelOrderInputDto) {return this.service.command(req.actor,'cancel-order',input);}
}
