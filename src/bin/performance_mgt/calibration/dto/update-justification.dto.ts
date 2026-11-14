import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateJustificationDto {
  @IsNotEmpty({ message: 'Justification is required.' })
  @IsString({ message: 'Justification must be a string.' })
  @MaxLength(1000, {
    message: 'Justification must be at most 1000 characters.',
  })
  justification: string;
}
