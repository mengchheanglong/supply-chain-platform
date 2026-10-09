import { Controller, Get, Res } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { Database } from '@supply-chain/operations';
import { ReadinessDto, LivenessDto } from '../transport/http/responses';
@Controller('api/health')
export class HealthController {
  constructor(private readonly db: Database) {}
  @Get('live')
  @ApiResponse({status:200,type:LivenessDto})
  live() { return { schemaVersion: 1, status: 'alive' }; }
  @Get('ready')
  @ApiResponse({status:200,type:ReadinessDto})
  @ApiResponse({status:503,type:ReadinessDto})
  async ready(@Res() reply: FastifyReply) {
    const result = await this.db.readiness();
    reply.status(result.status === 'ready' ? 200 : 503).send(result);
  }
}
