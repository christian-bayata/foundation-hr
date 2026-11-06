import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddComplianceChecklistItemDto {
  @IsString({ message: 'Compliance checklist label must be a string.' })
  @IsNotEmpty({ message: 'Compliance checklist label is required.' })
  @MaxLength(120, {
    message: 'Compliance checklist label must be at most 120 characters.',
  })
  label: string;

  @IsString({ message: 'Compliance checklist description must be a string.' })
  @IsOptional()
  @MaxLength(240, {
    message: 'Compliance checklist description must be at most 240 characters.',
  })
  description?: string;
}
