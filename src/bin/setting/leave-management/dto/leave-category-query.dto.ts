import { IsNotEmpty, IsString } from 'class-validator';

export class LeaveCategoryQueryDto {
  @IsString({ message: 'Leave category id must be a string.' })
  @IsNotEmpty({ message: 'Leave category id is required.' })
  id: string;
}
