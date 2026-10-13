import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class RequestWorkflowStepDto {
  @IsString({ message: 'Responsible party must be a string.' })
  @IsNotEmpty({ message: 'Responsible party is required.' })
  @MaxLength(120, {
    message: 'Responsible party must be at most 120 characters.',
  })
  responsibleParty: string;

  @IsInt({ message: 'Step order must be an integer.' })
  @Min(1, { message: 'Step order must be at least 1.' })
  @IsOptional()
  order?: number;
}
