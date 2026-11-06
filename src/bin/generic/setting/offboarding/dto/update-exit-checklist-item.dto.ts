import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateExitChecklistItemDto {
  @IsString({ message: 'Exit checklist label must be a string.' })
  @IsNotEmpty({ message: 'Exit checklist label is required.' })
  @MaxLength(120, {
    message: 'Exit checklist label must be at most 120 characters.',
  })
  @IsOptional()
  label?: string;

  @IsString({ message: 'Exit checklist description must be a string.' })
  @IsOptional()
  @MaxLength(240, {
    message: 'Exit checklist description must be at most 240 characters.',
  })
  description?: string | null;

  @IsBoolean({ message: 'Exit checklist selected flag must be a boolean.' })
  @IsOptional()
  selected?: boolean;
}
