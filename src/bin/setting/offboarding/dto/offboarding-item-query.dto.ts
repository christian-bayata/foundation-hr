import { IsNotEmpty, IsString } from 'class-validator';

export class OffboardingItemQueryDto {
  @IsString({ message: 'Id must be a string.' })
  @IsNotEmpty({ message: 'Id is required.' })
  id: string;
}
