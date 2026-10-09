import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkuService, pageInput } from '@supply-chain/operations';
import { AuthorizedRequest, TenantGuard } from '../identity/guard';
import { CreateSkuDto } from './dto';
import { SkuPageDto, CreatedDto, ErrorDto, ErrorMessageDto } from '../../transport/http/responses';
@ApiTags('skus')
@ApiBearerAuth()
@ApiExtraModels(ErrorMessageDto)
@ApiResponse({status:401,type:ErrorDto})
@ApiResponse({status:403,type:ErrorDto})
@ApiResponse({status:503,type:ErrorDto})
@Controller('api/v1/skus')
@UseGuards(TenantGuard)
export class SkuController {
  constructor(private readonly service: SkuService) {}
  @Get()
  @ApiQuery({name:'limit',required:false,type:Number,minimum:1,maximum:200})
  @ApiQuery({name:'cursor',required:false,type:String})
  @ApiResponse({status:200,type:SkuPageDto})
  @ApiResponse({status:400,type:ErrorDto})
  list(@Req() request: AuthorizedRequest, @Query('limit') limit?: string, @Query('cursor') cursor?: string) {
    return this.service.list(request.actor,pageInput(request.actor.tenantId,'catalog',limit,cursor));
  }
  @Post()
  @ApiResponse({status:201,type:CreatedDto})
  @ApiResponse({status:400,type:ErrorDto})
  @ApiResponse({status:409,type:ErrorDto})
  create(@Req() request: AuthorizedRequest, @Body() input: CreateSkuDto) { return this.service.create(request.actor,input); }
}
