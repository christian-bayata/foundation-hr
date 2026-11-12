import { IsString, IsOptional, MaxLength } from 'class-validator';

export class SendReminderDto {
  @IsString({ message: 'Subject employee id must be a string.' })
  subjectEmployeeId: string;

  @IsOptional()
  @IsString({ message: 'Reminder note must be a string.' })
  @MaxLength(500, { message: 'Reminder note must be at most 500 characters.' })
  reminderNote?: string;
}
