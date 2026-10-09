import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ExchangeService, pageInput } from '@supply-chain/operations';
import { AuthorizedRequest, TenantGuard, ReadOperation } from '../identity/guard';
import { ErrorDto, ErrorMessageDto } from '../../transport/http/responses';
import { WorkflowPageQueryDto } from '../fulfillment/dto';
import { MappingInputDto, MappingReceiptDto, ImportInputDto, ExportInputDto, ExchangeDocumentDto, DocumentPageDto, MappingPageDto, DocumentScopeDto, SnapshotInputDto, SnapshotManifestDto, SnapshotPageDto, ArtifactScopeDto, SnapshotArtifactDto } from './dto';
@ApiTags('integrations') @ApiBearerAuth() @ApiExtraModels(ErrorMessageDto)
@ApiResponse({status:400,type:ErrorDto}) @ApiResponse({status:401,type:ErrorDto}) @ApiResponse({status:403,type:ErrorDto}) @ApiResponse({status:404,type:ErrorDto}) @ApiResponse({status:409,type:ErrorDto}) @ApiResponse({status:503,type:ErrorDto})
@Controller('api/v1/integrations') @UseGuards(TenantGuard)
export class ExchangeController {
 constructor(private readonly service:ExchangeService) {}
 @Post('mappings') @ApiResponse({status:201,type:MappingReceiptDto})
 map(@Req() req:AuthorizedRequest,@Body() input:MappingInputDto){return this.service.map(req.actor,input);}
 @Post('imports') @ApiResponse({status:201,type:ExchangeDocumentDto}) @ApiResponse({status:413,type:ErrorDto})
 import(@Req() req:AuthorizedRequest,@Body() input:ImportInputDto){return this.service.import(req.actor,input);}
 @Post('exports') @ReadOperation() @ApiResponse({status:201,type:ExchangeDocumentDto})
 export(@Req() req:AuthorizedRequest,@Body() input:ExportInputDto){return this.service.export(req.actor,input);}
 @Get('document') @ApiResponse({status:200,type:ExchangeDocumentDto})
 get(@Req() req:AuthorizedRequest,@Query() input:DocumentScopeDto){return this.service.get(req.actor,input.id);}
 @Get('documents') @ApiResponse({status:200,type:DocumentPageDto})
 list(@Req() req:AuthorizedRequest,@Query() input:WorkflowPageQueryDto){return this.service.list(req.actor,pageInput(req.actor.tenantId,'integration-documents',input.limit,input.cursor));}
 @Get('mappings') @ApiResponse({status:200,type:MappingPageDto})
 mappings(@Req() req:AuthorizedRequest,@Query() input:WorkflowPageQueryDto){return this.service.mappings(req.actor,pageInput(req.actor.tenantId,'integration-mappings',input.limit,input.cursor));}
 @Post('snapshots') @ApiResponse({status:201,type:SnapshotManifestDto})
 snapshot(@Req() req:AuthorizedRequest,@Body() input:SnapshotInputDto){return this.service.snapshot(req.actor,input);}
 @Get('snapshots') @ReadOperation() @ApiResponse({status:200,type:SnapshotPageDto})
 snapshots(@Req() req:AuthorizedRequest,@Query() input:WorkflowPageQueryDto){return this.service.listSnapshots(req.actor,pageInput(req.actor.tenantId,'integration-snapshots',input.limit,input.cursor));}
 @Get('snapshot') @ReadOperation() @ApiResponse({status:200,type:SnapshotManifestDto})
 getSnapshot(@Req() req:AuthorizedRequest,@Query() input:DocumentScopeDto){return this.service.getSnapshot(req.actor,input.id);}
 @Get('snapshot/artifact') @ReadOperation() @ApiResponse({status:200,type:SnapshotArtifactDto})
 getArtifact(@Req() req:AuthorizedRequest,@Query() input:ArtifactScopeDto){return this.service.getArtifact(req.actor,input.id,input.name);}
}

