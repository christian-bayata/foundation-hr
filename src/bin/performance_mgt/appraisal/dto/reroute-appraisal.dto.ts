import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RerouteAppraisalDto {
  @IsNotEmpty({ message: 'Manager id is required.' })
  @IsString({ message: 'Manager id must be a string.' })
  managerId: string;

  @IsOptional()
  @IsString({ message: 'Reason must be a string.' })
  @MaxLength(500, { message: 'Reason must be at most 500 characters.' })
  reason?: string;
}
