import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { MoveNineBoxDto } from './move-nine-box.dto';

export class BulkMoveNineBoxItemDto extends MoveNineBoxDto {
  @IsNotEmpty({ message: 'Appraisal id is required.' })
  @IsString({ message: 'Appraisal id must be a string.' })
  appraisalId: string;
}

export class BulkMoveNineBoxDto {
  @IsArray({ message: 'Items must be an array.' })
  @ArrayMinSize(1, { message: 'At least one item is required.' })
  @ValidateNested({ each: true })
  @Type(() => BulkMoveNineBoxItemDto)
  items: BulkMoveNineBoxItemDto[];
}
