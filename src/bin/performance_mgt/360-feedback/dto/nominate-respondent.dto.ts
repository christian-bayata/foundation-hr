import { IsString, IsOptional, MaxLength } from 'class-validator';

export class NominateRespondentDto {
  @IsString({ message: 'Subject employee id must be a string.' })
  subjectEmployeeId: string;

  @IsString({ message: 'Respondent type must be a string.' })
  respondentType: string;

  @IsOptional()
  @IsString({ message: 'Nomination note must be a string.' })
  @MaxLength(500, { message: 'Nomination note must be at most 500 characters.' })
  nominationNote?: string;
}
