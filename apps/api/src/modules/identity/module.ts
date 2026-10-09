import { Controller, Get, Module, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiResponse } from '@nestjs/swagger';
import { AuthorizedRequest, TenantGuard } from './guard';
import { ContextDto, ErrorDto, ErrorMessageDto } from '../../transport/http/responses';
@Controller('api/v1/context')
@UseGuards(TenantGuard)
@ApiBearerAuth()
@ApiExtraModels(ErrorMessageDto)
export class ContextController {
  @Get()
  @ApiResponse({status:200,type:ContextDto})
  @ApiResponse({status:401,type:ErrorDto})
  @ApiResponse({status:503,type:ErrorDto})
  context(@Req() request: AuthorizedRequest) {
    const { correlationId, ...actor } = request.actor;
    return { schemaVersion: 1, ...actor };
  }
}
@Module({controllers:[ContextController]})
export class IdentityModule {}
