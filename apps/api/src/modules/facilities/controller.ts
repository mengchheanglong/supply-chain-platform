import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FacilityService, pageInput } from '@supply-chain/operations';
import { AuthorizedRequest, TenantGuard } from '../identity/guard';
import { CreateFacilityDto } from './dto';
import { FacilityPageDto, CreatedDto, ErrorDto, ErrorMessageDto } from '../../transport/http/responses';
@ApiTags('facilities')
@ApiBearerAuth()
@ApiExtraModels(ErrorMessageDto)
@ApiResponse({status:401,type:ErrorDto})
@ApiResponse({status:403,type:ErrorDto})
@ApiResponse({status:503,type:ErrorDto})
@Controller('api/v1/facilities')
@UseGuards(TenantGuard)
export class FacilityController {
  constructor(private readonly service: FacilityService) {}
  @Get()
  @ApiQuery({name:'limit',required:false,type:Number,minimum:1,maximum:200})
  @ApiQuery({name:'cursor',required:false,type:String})
  @ApiResponse({status:200,type:FacilityPageDto})
  @ApiResponse({status:400,type:ErrorDto})
  list(@Req() request: AuthorizedRequest, @Query('limit') limit?: string, @Query('cursor') cursor?: string) {
    return this.service.list(request.actor,pageInput(request.actor.tenantId,'facilities',limit,cursor));
  }
  @Post()
  @ApiResponse({status:201,type:CreatedDto})
  @ApiResponse({status:400,type:ErrorDto})
  @ApiResponse({status:409,type:ErrorDto})
  create(@Req() request: AuthorizedRequest, @Body() input: CreateFacilityDto) { return this.service.create(request.actor,input); }
}
