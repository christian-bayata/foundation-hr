import { IsNotEmpty, IsString } from 'class-validator';

export class LeaveRestrictedPeriodQueryDto {
  @IsString({ message: 'Restricted period id must be a string.' })
  @IsNotEmpty({ message: 'Restricted period id is required.' })
  id: string;
}
