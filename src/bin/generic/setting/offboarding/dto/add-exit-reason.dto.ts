import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddExitReasonDto {
  @IsString({ message: 'Exit reason must be a string.' })
  @IsNotEmpty({ message: 'Exit reason is required.' })
  @MaxLength(120, { message: 'Exit reason must be at most 120 characters.' })
  label: string;
}
