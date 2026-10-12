import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddPensionFundAdministratorDto {
  @IsString({ message: 'PFA name must be a string.' })
  @IsNotEmpty({ message: 'PFA name is required.' })
  @MaxLength(120, { message: 'PFA name must be at most 120 characters.' })
  name: string;
}
