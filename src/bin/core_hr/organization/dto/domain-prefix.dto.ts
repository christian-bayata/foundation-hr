import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  DOMAIN_PREFIX_MAX_LENGTH,
  DOMAIN_PREFIX_PATTERN,
} from '../organization.utility';

export class UpdateDomainPrefixDto {
  @IsString({ message: 'Domain prefix must be a string.' })
  @IsNotEmpty({ message: 'Domain prefix is required.' })
  @MaxLength(DOMAIN_PREFIX_MAX_LENGTH, {
    message: `Domain prefix must be at most ${DOMAIN_PREFIX_MAX_LENGTH} characters.`,
  })
  @Matches(DOMAIN_PREFIX_PATTERN, {
    message:
      'Domain prefix must be 3 to 30 characters of lowercase letters, numbers or hyphens, and must start and end with a letter or a number.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  domainPrefix: string;
}

export class DomainPrefixQueryDto {
  @IsString({ message: 'Domain prefix must be a string.' })
  @IsNotEmpty({ message: 'Domain prefix is required.' })
  @MaxLength(DOMAIN_PREFIX_MAX_LENGTH, {
    message: `Domain prefix must be at most ${DOMAIN_PREFIX_MAX_LENGTH} characters.`,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  domainPrefix: string;
}
