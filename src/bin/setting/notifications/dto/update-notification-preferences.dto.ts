import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsBoolean({ message: 'News and updates must be a boolean.' })
  @IsOptional()
  newsAndUpdates?: boolean;

  @IsBoolean({ message: 'Reminders and events must be a boolean.' })
  @IsOptional()
  remindersAndEvents?: boolean;

  @IsBoolean({ message: 'Promotion and offers must be a boolean.' })
  @IsOptional()
  promotionsAndOffers?: boolean;

  @IsBoolean({ message: 'Email notifications must be a boolean.' })
  @IsOptional()
  emailNotifications?: boolean;

  @IsBoolean({ message: 'Push notifications must be a boolean.' })
  @IsOptional()
  pushNotifications?: boolean;

  @IsBoolean({ message: 'SMS notifications must be a boolean.' })
  @IsOptional()
  smsNotifications?: boolean;

  @IsBoolean({ message: 'Leave and attendance must be a boolean.' })
  @IsOptional()
  leaveAndAttendance?: boolean;

  @IsBoolean({ message: 'Deadline notification must be a boolean.' })
  @IsOptional()
  deadlineNotification?: boolean;
}
