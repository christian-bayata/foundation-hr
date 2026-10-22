import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AppException } from '../../common/response/app-exception';
import { OrganizationRepository } from './repository/organization.repository';
import { OrganizationService } from './organization.service';
import { OrganizationUtility } from './organization.utility';

const ORG_ID = '64f1b2c3d4e5f678901234ab';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('OrganizationService', () => {
  let service: OrganizationService;
  let organizationRepository: {
    findOrg: jest.Mock<AnyPromiseFn>;
    updateById: jest.Mock<AnyPromiseFn>;
    isDomainPrefixTaken: jest.Mock<AnyPromiseFn>;
  };
  let organizationUtility: OrganizationUtility;

  beforeEach(async () => {
    jest.clearAllMocks();

    organizationRepository = {
      findOrg: jest.fn<AnyPromiseFn>().mockResolvedValue({ _id: ORG_ID }),
      updateById: jest.fn<AnyPromiseFn>().mockResolvedValue({ _id: ORG_ID }),
      isDomainPrefixTaken: jest.fn<AnyPromiseFn>().mockResolvedValue(false),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: OrganizationRepository, useValue: organizationRepository },
        OrganizationUtility,
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
    organizationUtility = module.get<OrganizationUtility>(OrganizationUtility);
  });

  describe('updateDomainPrefix', () => {
    it('stores the normalized domain prefix for the organization', async () => {
      const result = await service.updateDomainPrefix(ORG_ID, {
        domainPrefix: 'Mavins',
      });

      expect(organizationRepository.updateById).toHaveBeenCalledWith(ORG_ID, {
        domainPrefix: 'mavins',
      });
      expect(result).toEqual({ domainPrefix: 'mavins' });
    });

    it('rejects a prefix that is already claimed by another organization', async () => {
      organizationRepository.isDomainPrefixTaken.mockResolvedValue(true);

      await expect(
        service.updateDomainPrefix(ORG_ID, { domainPrefix: 'mavins' }),
      ).rejects.toThrow(AppException);

      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });

    it('ignores the organization itself when checking availability', async () => {
      await service.updateDomainPrefix(ORG_ID, { domainPrefix: 'mavins' });

      expect(
        organizationRepository.isDomainPrefixTaken,
      ).toHaveBeenCalledWith('mavins', ORG_ID);
    });

    it('rejects an invalid domain prefix', async () => {
      await expect(
        service.updateDomainPrefix(ORG_ID, { domainPrefix: '-mavins-' }),
      ).rejects.toThrow(AppException);

      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });

    it('rejects a reserved domain prefix', async () => {
      await expect(
        service.updateDomainPrefix(ORG_ID, { domainPrefix: 'www' }),
      ).rejects.toThrow(AppException);

      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.updateDomainPrefix(ORG_ID, { domainPrefix: 'mavins' }),
      ).rejects.toThrow(AppException);

      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });

    it('surfaces a duplicate key error as a conflict', async () => {
      const duplicateKeyError: any = new Error(
        'E11000 duplicate key error collection',
      );
      duplicateKeyError.code = 11000;
      organizationRepository.updateById.mockRejectedValue(duplicateKeyError);

      await expect(
        service.updateDomainPrefix(ORG_ID, { domainPrefix: 'mavins' }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('getPublicBrandingByDomainPrefix', () => {
    it('returns the branding assets of the organization that owns the prefix', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        branding: {
          logoUrl: 'https://cdn.example.com/logo.png',
          navigationBackgroundColor: '#FAFDFF',
          buttonColor: '#1E88E5',
          customDomains: ['@foundationhr.com'],
          loginPageImages: ['https://cdn.example.com/login-hero.png'],
          selectedLoginImg: 'https://cdn.example.com/login-hero.png',
        },
      });

      const result = await service.getPublicBrandingByDomainPrefix('Mavins');

      expect(organizationRepository.findOrg).toHaveBeenCalledWith(
        { domainPrefix: 'mavins' },
        'branding',
      );
      expect(result).toEqual({
        logoUrl: 'https://cdn.example.com/logo.png',
        navigationBackgroundColor: '#FAFDFF',
        buttonColor: '#1E88E5',
        loginPageImages: ['https://cdn.example.com/login-hero.png'],
        selectedLoginImg: 'https://cdn.example.com/login-hero.png',
      });
      expect(result).not.toHaveProperty('customDomains');
    });

    it('never returns the custom domains of the organization', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        branding: {
          logoUrl: null,
          navigationBackgroundColor: null,
          buttonColor: null,
          customDomains: ['@secret.example.com'],
          loginPageImages: [],
          selectedLoginImg: null,
        },
      });

      const result = await service.getPublicBrandingByDomainPrefix('mavins');

      expect(result).not.toHaveProperty('customDomains');
    });

    it('returns the default branding when the organization has none saved', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        branding: null,
      });

      const result = await service.getPublicBrandingByDomainPrefix('mavins');

      expect(result).toEqual({
        logoUrl: null,
        navigationBackgroundColor: null,
        buttonColor: null,
        loginPageImages: [],
        selectedLoginImg: null,
      });
    });

    it('throws a 404 when no organization owns the prefix', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.getPublicBrandingByDomainPrefix('unknown'),
      ).rejects.toThrow(AppException);
    });
  });

  describe('generateAvailableDomainPrefix', () => {
    it('derives the prefix from the organization name', async () => {
      const result = await service.generateAvailableDomainPrefix('Mavins Ltd');

      expect(result).toBe('mavins-ltd');
    });

    it('appends a suffix when the derived prefix is taken', async () => {
      organizationRepository.isDomainPrefixTaken
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await service.generateAvailableDomainPrefix('Mavins');

      expect(result).toBe('mavins-2');
    });

    it('never returns a reserved prefix', async () => {
      const result = await service.generateAvailableDomainPrefix('www');

      expect(organizationUtility.isReservedDomainPrefix(result)).toBe(false);
    });
  });
});
