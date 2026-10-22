import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { AppResponse } from '../../common/response/app-response';
import { OrganizationRepository } from './repository/organization.repository';
import { OrganizationUtility } from './organization.utility';
import { UpdateDomainPrefixDto } from './dto/domain-prefix.dto';
import { PublicBranding } from './interface/organization.interface';

const DEFAULT_PUBLIC_BRANDING: PublicBranding = {
  logoUrl: null,
  navigationBackgroundColor: null,
  buttonColor: null,
  loginPageImages: [],
  selectedLoginImg: null,
};

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    @Inject(OrganizationRepository)
    private readonly organizationRepository: OrganizationRepository,
    @Inject(OrganizationUtility)
    private readonly organizationUtility: OrganizationUtility,
  ) {}

  /**
   * @Responsibility: Produce a domain prefix that is not claimed by any
   * organization yet. The candidate is derived from the organization's name and
   * a numeric suffix is appended until an unused prefix is found.
   *
   * @param name - The organization's name
   * @returns {Promise<string>} The available domain prefix
   */
  async generateAvailableDomainPrefix(name: string): Promise<string> {
    const base = this.organizationUtility.deriveDomainPrefixFromName(name);

    let candidate = base;
    let attempt = 1;

    while (await this.organizationRepository.isDomainPrefixTaken(candidate)) {
      attempt += 1;
      const suffix = `-${attempt}`;
      candidate = `${base.slice(0, 30 - suffix.length)}${suffix}`;
    }

    return candidate;
  }

  /**
   * @Responsibility: Set the domain prefix that identifies an organization on
   * the platform's subdomains. The prefix is normalized, validated against the
   * DNS label rules and the reserved list, and rejected when another
   * organization already claims it.
   *
   * @param organizationId - The organization to update
   * @param dto - The requested domain prefix
   * @returns {Promise<{ domainPrefix: string }>}
   *
   * @throws {400} Invalid or reserved domain prefix
   * @throws {404} Organization not found
   * @throws {409} Domain prefix already in use
   */
  async updateDomainPrefix(
    organizationId: string,
    dto: UpdateDomainPrefixDto,
  ): Promise<{ domainPrefix: string }> {
    try {
      const domainPrefix = this.organizationUtility.normalizeDomainPrefix(
        dto.domainPrefix,
      );

      if (!this.organizationUtility.isValidDomainPrefix(domainPrefix)) {
        AppResponse.error({
          message:
            'Domain prefix must be 3 to 30 characters of lowercase letters, numbers or hyphens, and must start and end with a letter or a number.',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      if (this.organizationUtility.isReservedDomainPrefix(domainPrefix)) {
        AppResponse.error({
          message: 'This domain prefix is reserved. Please choose another one.',
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const found = await this.organizationRepository.findOrg({
        _id: organizationId,
      });

      if (!found) {
        AppResponse.error({
          message: 'Organization not found',
          status: HttpStatus.NOT_FOUND,
        });
      }

      if (
        await this.organizationRepository.isDomainPrefixTaken(
          domainPrefix,
          organizationId,
        )
      ) {
        AppResponse.error({
          message: 'This domain prefix is already in use.',
          status: HttpStatus.CONFLICT,
        });
      }

      const updated = await this.organizationRepository.updateById(
        organizationId,
        { domainPrefix },
      );

      if (!updated) {
        AppResponse.error({
          message: 'Failed to update the organization domain prefix',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      this.logger.log(
        `Updated domain prefix for org ${organizationId} to ${domainPrefix}`,
      );

      return { domainPrefix };
    } catch (error: any) {
      if (this.isDuplicateKeyError(error)) {
        AppResponse.error({
          message: 'This domain prefix is already in use.',
          status: HttpStatus.CONFLICT,
        });
      }

      error.location = `OrganizationService.${this.updateDomainPrefix.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Retrieve the branding assets of the organization that
   * owns a domain prefix. This backs the unauthenticated login page, so only
   * the branding subset is returned and never the organization's other
   * settings.
   *
   * @param domainPrefix - The organization's domain prefix
   * @returns {Promise<PublicBranding>}
   *
   * @throws {404} No organization owns the given domain prefix
   */
  async getPublicBrandingByDomainPrefix(
    domainPrefix: string,
  ): Promise<PublicBranding> {
    try {
      const normalized = this.organizationUtility.normalizeDomainPrefix(
        domainPrefix,
      );

      const organization = await this.organizationRepository.findOrg(
        { domainPrefix: normalized },
        'branding',
      );

      if (!organization) {
        AppResponse.error({
          message: 'No organization was found for the given domain prefix.',
          status: HttpStatus.NOT_FOUND,
        });
      }

      const branding = organization?.branding;

      if (!branding) {
        return { ...DEFAULT_PUBLIC_BRANDING };
      }

      return {
        logoUrl: branding.logoUrl ?? null,
        navigationBackgroundColor: branding.navigationBackgroundColor ?? null,
        buttonColor: branding.buttonColor ?? null,
        loginPageImages: branding.loginPageImages ?? [],
        selectedLoginImg: branding.selectedLoginImg ?? null,
      };
    } catch (error: any) {
      error.location = `OrganizationService.${this.getPublicBrandingByDomainPrefix.name} method`;
      AppResponse.error(error);
      throw error;
    }
  }

  /**
   * @Responsibility: Detect the MongoDB duplicate key error raised when the
   * unique index on the domain prefix is violated by a concurrent update.
   *
   * @param error - The caught error
   * @returns {boolean}
   */
  private isDuplicateKeyError(error: any): boolean {
    return error?.code === 11000;
  }
}
