import { IsString, IsOptional, MaxLength } from 'class-validator';

export class SendBulkReminderDto {
  @IsString({ message: 'Cycle id must be a string.' })
  cycleId: string;

  @IsOptional()
  @IsString({ message: 'Reminder note must be a string.' })
  @MaxLength(500, { message: 'Reminder note must be at most 500 characters.' })
  reminderNote?: string;
}
