import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddOffboardingTypeDto {
  @IsString({ message: 'Off-boarding type must be a string.' })
  @IsNotEmpty({ message: 'Off-boarding type is required.' })
  @MaxLength(120, {
    message: 'Off-boarding type must be at most 120 characters.',
  })
  label: string;
}
