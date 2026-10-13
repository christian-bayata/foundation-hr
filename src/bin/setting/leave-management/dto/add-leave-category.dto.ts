import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddLeaveCategoryDto {
  @IsString({ message: 'Leave category must be a string.' })
  @IsNotEmpty({ message: 'Leave category is required.' })
  @MaxLength(120, {
    message: 'Leave category must be at most 120 characters.',
  })
  label: string;
}
