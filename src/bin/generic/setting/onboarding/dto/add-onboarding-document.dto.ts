import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { OnboardingDocumentCategory } from '../enum/onboarding.enum';

export class AddOnboardingDocumentDto {
  @IsEnum(OnboardingDocumentCategory, {
    message: 'Document category is not valid.',
  })
  @IsNotEmpty({ message: 'Document category is required.' })
  category: OnboardingDocumentCategory;

  @IsString({ message: 'Document label must be a string.' })
  @IsNotEmpty({ message: 'Document label is required.' })
  @MaxLength(160, {
    message: 'Document label must be at most 160 characters.',
  })
  label: string;
}
