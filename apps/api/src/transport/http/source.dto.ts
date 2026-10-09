import { IsIn, IsInt, IsNumber, IsString, Length, Matches, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class SourceDto {
  @IsString() @Length(1,80) @Matches(/^[A-Za-z0-9_.-]+$/) sourceSystem!: string;
  @IsString() @Length(1,160) @Matches(/^\S(?:.*\S)?$/) externalId!: string;
  @IsString() @Length(1,64) @Matches(/^[A-Za-z0-9_.-]+$/) code!: string;
  @IsString() @Length(1,160) @Matches(/^\S(?:.*\S)?$/) name!: string;
}
for (const [key,maxLength] of [['sourceSystem',80],['externalId',160],['code',64],['name',160]] as const)
  ApiProperty({type:String,minLength:1,maxLength,pattern:key==='sourceSystem'||key==='code'?'^[A-Za-z0-9_.-]+$':'^\\S(?:.*\\S)?$'})(SourceDto.prototype,key);
