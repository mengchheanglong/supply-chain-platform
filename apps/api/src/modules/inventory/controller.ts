import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InventoryService, inventoryResource, pageInput } from '@supply-chain/operations';
import { AuthorizedRequest, TenantGuard } from '../identity/guard';
import { ErrorDto, ErrorMessageDto } from '../../transport/http/responses';
import { StockScopeDto, InventoryListQueryDto, StockCommandDto, ReservationCommandDto, InventoryCommandResultDto, BalanceDto, ReservationPageDto, MovementPageDto, ReconciliationDto } from './dto';
@ApiTags('inventory') @ApiBearerAuth() @ApiExtraModels(ErrorMessageDto)
@ApiResponse({status:400,type:ErrorDto}) @ApiResponse({status:401,type:ErrorDto}) @ApiResponse({status:403,type:ErrorDto})
@ApiResponse({status:404,type:ErrorDto}) @ApiResponse({status:409,type:ErrorDto}) @ApiResponse({status:503,type:ErrorDto})
@Controller('api/v1/inventory') @UseGuards(TenantGuard)
export class InventoryController {
  constructor(private readonly service: InventoryService) {}
  @Get('balance') @ApiResponse({status:200,type:BalanceDto})
  balance(@Req() request: AuthorizedRequest,@Query() key: StockScopeDto) { return this.service.balance(request.actor,key); }
  @Get('reconciliation') @ApiResponse({status:200,type:ReconciliationDto})
  reconcile(@Req() request: AuthorizedRequest,@Query() key: StockScopeDto) { return this.service.reconcile(request.actor,key); }
  @Get('reservations') @ApiResponse({status:200,type:ReservationPageDto})
  reservations(@Req() request: AuthorizedRequest,@Query() query: InventoryListQueryDto) {
    const key={facilityId:query.facilityId,skuId:query.skuId};
    return this.service.list(request.actor,key,pageInput(request.actor.tenantId,inventoryResource('reservations',key),query.limit,query.cursor),'reservations');
  }
  @Get('movements') @ApiResponse({status:200,type:MovementPageDto})
  movements(@Req() request: AuthorizedRequest,@Query() query: InventoryListQueryDto) {
    const key={facilityId:query.facilityId,skuId:query.skuId};
    return this.service.list(request.actor,key,pageInput(request.actor.tenantId,inventoryResource('movements',key),query.limit,query.cursor),'movements');
  }
  @Post('receive') @ApiResponse({status:201,type:InventoryCommandResultDto}) @ApiResponse({status:413,type:ErrorDto})
  receive(@Req() request: AuthorizedRequest,@Body() body: StockCommandDto) { return this.service.command(request.actor,'receive',body); }
  @Post('reserve') @ApiResponse({status:201,type:InventoryCommandResultDto}) @ApiResponse({status:413,type:ErrorDto})
  reserve(@Req() request: AuthorizedRequest,@Body() body: StockCommandDto) { return this.service.command(request.actor,'reserve',body); }
  @Post('release') @ApiResponse({status:201,type:InventoryCommandResultDto}) @ApiResponse({status:413,type:ErrorDto})
  release(@Req() request: AuthorizedRequest,@Body() body: ReservationCommandDto) { return this.service.command(request.actor,'release',body); }
  @Post('ship') @ApiResponse({status:201,type:InventoryCommandResultDto}) @ApiResponse({status:413,type:ErrorDto})
  ship(@Req() request: AuthorizedRequest,@Body() body: ReservationCommandDto) { return this.service.command(request.actor,'ship',body); }
}
