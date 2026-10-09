import { IsIn, IsInt, IsNumber, IsString, Length, Matches, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SourceDto } from '../../transport/http/source.dto';
import type { SkuInput } from '@supply-chain/operations';
export class CreateSkuDto extends SourceDto {
  @IsIn(['each','kg','m3','litre']) unit!: SkuInput['unit'];
  @IsInt() @Min(0) @Max(6) quantityPrecision!: number;
}

ApiProperty({ enum: ['each','kg','m3','litre'] })(CreateSkuDto.prototype,'unit');
ApiProperty({ type: 'integer', minimum: 0, maximum: 6 })(CreateSkuDto.prototype,'quantityPrecision');
