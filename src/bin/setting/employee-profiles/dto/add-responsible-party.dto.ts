import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddResponsiblePartyDto {
  @IsString({ message: 'Party name must be a string.' })
  @IsNotEmpty({ message: 'Party name is required.' })
  @MaxLength(120, { message: 'Party name must be at most 120 characters.' })
  name: string;
}
