import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
} from 'class-validator';
import {
  DocumentFormat,
  EmploymentType,
} from '../enum/employee-profile.enum';

export class UpdateEmployeeProfileSettingsDto {
  @IsBoolean({ message: 'Employee ID auto-generation must be a boolean.' })
  @IsOptional()
  useEmployeeIdGenerator?: boolean;

  @IsArray({ message: 'Document formats must be an array.' })
  @ArrayUnique({ message: 'Document formats must not contain duplicates.' })
  @IsEnum(DocumentFormat, {
    each: true,
    message: 'One or more selected document formats are not valid.',
  })
  @IsOptional()
  documentFormats?: DocumentFormat[];

  @IsArray({ message: 'Employment types must be an array.' })
  @ArrayUnique({ message: 'Employment types must not contain duplicates.' })
  @IsEnum(EmploymentType, {
    each: true,
    message: 'One or more selected employment types are not valid.',
  })
  @IsOptional()
  employmentTypes?: EmploymentType[];
}
