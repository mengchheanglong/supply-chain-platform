import { IsIn, IsInt, IsNumber, IsString, Length, Matches, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SourceDto } from '../../transport/http/source.dto';
export class CreateFacilityDto extends SourceDto {
  @IsIn(['warehouse','depot']) kind!: 'warehouse' | 'depot';
  @IsString() @Length(1,80) timezone!: string;
  @IsNumber({ allowNaN:false,allowInfinity:false }) @Min(-90) @Max(90) latitude!: number;
  @IsNumber({ allowNaN:false,allowInfinity:false }) @Min(-180) @Max(180) longitude!: number;
  @IsIn(['surveyed','imported','estimated']) locationSource!: 'surveyed' | 'imported' | 'estimated';
}
ApiProperty({ enum: ['warehouse','depot'] })(CreateFacilityDto.prototype,'kind');
ApiProperty({ type: String, minLength:1,maxLength:80 })(CreateFacilityDto.prototype,'timezone');
ApiProperty({ type: Number, minimum: -90, maximum: 90 })(CreateFacilityDto.prototype,'latitude');
ApiProperty({ type: Number, minimum: -180, maximum: 180 })(CreateFacilityDto.prototype,'longitude');
ApiProperty({ enum: ['surveyed','imported','estimated'] })(CreateFacilityDto.prototype,'locationSource');
