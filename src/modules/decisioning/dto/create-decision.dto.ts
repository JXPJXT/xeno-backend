import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateDecisionDto {
  @ApiProperty({
    example: 'Reactivate dormant customers',
    description: 'Natural language business goal',
  })
  @IsString()
  @MinLength(3)
  goal: string;
}
