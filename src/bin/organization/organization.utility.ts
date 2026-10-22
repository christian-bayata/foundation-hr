import { Injectable } from '@nestjs/common';

export const DOMAIN_PREFIX_MIN_LENGTH = 3;
export const DOMAIN_PREFIX_MAX_LENGTH = 30;

/**
 * A domain prefix becomes a DNS label (<prefix>.foundationhr.com), so it is
 * limited to lowercase letters, numbers and inner hyphens, and it has to start
 * and end with a letter or a number.
 */
export const DOMAIN_PREFIX_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

/**
 * Prefixes that are held back because they are either already in use on the
 * platform's own subdomains or would be confusing for a customer to own.
 */
export const RESERVED_DOMAIN_PREFIXES: string[] = [
  'www',
  'api',
  'app',
  'admin',
  'auth',
  'assets',
  'billing',
  'cdn',
  'dashboard',
  'dev',
  'docs',
  'ftp',
  'foundation',
  'foundationhr',
  'help',
  'hr',
  'images',
  'login',
  'mail',
  'media',
  'mx',
  'ns',
  'portal',
  'register',
  'signup',
  'smtp',
  'staging',
  'static',
  'status',
  'support',
  'test',
  'webmail',
  'www2',
];

@Injectable()
export class OrganizationUtility {
  /**
   * @Responsibility: Normalize a domain prefix so lookups and uniqueness
   * checks are case-insensitive.
   *
   * @param value - The raw prefix
   * @returns The trimmed, lowercased prefix
   */
  normalizeDomainPrefix(value: string): string {
    return value?.trim().toLowerCase() ?? '';
  }

  /**
   * @Responsibility: Check whether a normalized prefix is a valid DNS label
   * that can be used as a subdomain.
   *
   * @param value - The normalized prefix
   * @returns {boolean}
   */
  isValidDomainPrefix(value: string): boolean {
    return DOMAIN_PREFIX_PATTERN.test(value);
  }

  /**
   * @Responsibility: Check whether a prefix is reserved for platform use.
   *
   * @param value - The normalized prefix
   * @returns {boolean}
   */
  isReservedDomainPrefix(value: string): boolean {
    return RESERVED_DOMAIN_PREFIXES.includes(value);
  }

  /**
   * @Responsibility: Derive a candidate prefix from an organization name. The
   * name is slugified, truncated to the maximum length and guarded against the
   * reserved list so a newly created organization always receives a usable
   * prefix.
   *
   * @param name - The organization's name
   * @returns The candidate prefix
   */
  deriveDomainPrefixFromName(name: string): string {
    const slug = (name ?? '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .slice(0, DOMAIN_PREFIX_MAX_LENGTH)
      .replace(/-+$/g, '');

    let candidate = slug.length >= DOMAIN_PREFIX_MIN_LENGTH ? slug : 'org';

    if (this.isReservedDomainPrefix(candidate)) {
      candidate = `${candidate}-co`;
    }

    return candidate.slice(0, DOMAIN_PREFIX_MAX_LENGTH);
  }
}
