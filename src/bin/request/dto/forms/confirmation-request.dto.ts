import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class ConfirmationRequestDetailsDto {
  @IsString({ message: 'Location must be a string.' })
  @IsNotEmpty({ message: 'Location is required.' })
  @Matches(/\S/, { message: 'Location is required.' })
  @MaxLength(2000, { message: 'Location must be at most 2000 characters.' })
  location: string;
}
