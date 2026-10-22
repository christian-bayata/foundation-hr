import { Branding } from '../entity/organization.schema';

/**
 * The branding subset that is safe to expose on an unauthenticated endpoint.
 * `customDomains` is deliberately left out — it is internal configuration and
 * is not needed to render a login page.
 */
export type PublicBranding = Omit<Branding, 'customDomains'>;
