import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CalibrationPotential } from '../../appraisal/enums/appraisal.enums';

export class SetPotentialDto {
  @IsEnum(CalibrationPotential, { message: 'Potential is not valid.' })
  potential: CalibrationPotential;

  @IsOptional()
  @IsString({ message: 'Justification must be a string.' })
  @MaxLength(1000, {
    message: 'Justification must be at most 1000 characters.',
  })
  justification?: string;
}
