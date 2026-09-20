import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateHierarchyDto {
  @IsString()
  @IsNotEmpty({
    message: 'Employee id is required.',
  })
  employeeId: string;

  @IsString()
  @IsOptional()
  supervisorId?: string | null;
}
