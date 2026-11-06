import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateComplianceChecklistItemDto {
  @IsString({ message: 'Compliance checklist label must be a string.' })
  @IsNotEmpty({ message: 'Compliance checklist label is required.' })
  @MaxLength(120, {
    message: 'Compliance checklist label must be at most 120 characters.',
  })
  @IsOptional()
  label?: string;

  @IsString({ message: 'Compliance checklist description must be a string.' })
  @IsOptional()
  @MaxLength(240, {
    message: 'Compliance checklist description must be at most 240 characters.',
  })
  description?: string | null;

  @IsBoolean({
    message: 'Compliance checklist selected flag must be a boolean.',
  })
  @IsOptional()
  selected?: boolean;
}
