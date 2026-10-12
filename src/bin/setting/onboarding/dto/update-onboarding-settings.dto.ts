import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOnboardingSettingsDto {
  @IsBoolean({ message: 'Welcome message enabled must be a boolean.' })
  @IsOptional()
  welcomeMessageEnabled?: boolean;

  @IsString({ message: 'Welcome message must be a string.' })
  @MaxLength(2000, {
    message: 'Welcome message must be at most 2000 characters.',
  })
  @IsOptional()
  welcomeMessage?: string;

  @IsBoolean({ message: 'Default duration enabled must be a boolean.' })
  @IsOptional()
  defaultDurationEnabled?: boolean;

  @IsString({ message: 'Default duration must be a string.' })
  @MaxLength(120, {
    message: 'Default duration must be at most 120 characters.',
  })
  @IsOptional()
  defaultDuration?: string;
}
