import { IsEnum, IsNotEmpty } from 'class-validator';
import { InformationToUpdate } from './form-option.enums';

export class StaffDataUpdateDetailsDto {
  @IsEnum(InformationToUpdate, {
    message: 'Information to update is not valid.',
  })
  @IsNotEmpty({ message: 'Information to update is required.' })
  informationToUpdate: InformationToUpdate;
}
