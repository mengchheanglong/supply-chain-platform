import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { OperationalError } from '@supply-chain/operations';
import type { FastifyReply, FastifyRequest } from 'fastify';
@Catch()
export class Errors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    let status = 503, message: unknown = 'Operational persistence unavailable';
    if (error instanceof HttpException) { status = error.getStatus(); message = error.getResponse(); }
    else if (error instanceof OperationalError) { status = error.status; message = error.message; }
    else if ((error as { code?: string })?.code === '23505') { status = 409; message = 'Code or source identity already exists in this tenant'; }
    else if (['23514','23502','22003','22P02'].includes((error as { code?: string })?.code || '')) { status = 400; message = 'Invalid operational record'; }
    const request = host.switchToHttp().getRequest<FastifyRequest>();
    if (status >= 500) console.error(JSON.stringify({event:'request.failed',correlationId:request.id,status}));
    host.switchToHttp().getResponse<FastifyReply>().status(status).send({schemaVersion:1,statusCode:status,error:message,correlationId:request.id});
  }
}
