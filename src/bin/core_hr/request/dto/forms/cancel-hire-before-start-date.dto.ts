import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CancelHireBeforeStartDateDetailsDto {
  @IsString({ message: 'Reason for canceling hire must be a string.' })
  @IsNotEmpty({ message: 'Reason for canceling hire is required.' })
  @Matches(/\S/, { message: 'Reason for canceling hire is required.' })
  @MaxLength(2000, {
    message: 'Reason for canceling hire must be at most 2000 characters.',
  })
  reasonForCancelingHire: string;
}
