import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AppException } from '../../../common/response/app-exception';
import { OrganizationRepository } from '../../organization/repository/organization.repository';
import { SettingsDomainOrganisationService } from './settings.domain.organisation.service';

const ORG_ID = '64f1b2c3d4e5f678901234ab';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('SettingsDomainOrganisationService', () => {
  let service: SettingsDomainOrganisationService;
  let organizationRepository: {
    findById: jest.Mock<AnyPromiseFn>;
    updateById: jest.Mock<AnyPromiseFn>;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    organizationRepository = {
      findById: jest.fn(),
      updateById: jest.fn(),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      providers: [
        SettingsDomainOrganisationService,
        { provide: OrganizationRepository, useValue: organizationRepository },
      ],
    }).compile();

    service = module.get<SettingsDomainOrganisationService>(
      SettingsDomainOrganisationService,
    );
  });

  describe('getGeneralInfo', () => {
    it('returns the organization general information when found', async () => {
      const org = { _id: ORG_ID, name: 'FoundationHR' };
      organizationRepository.findById.mockResolvedValue(org);

      const result = await service.getGeneralInfo(ORG_ID);

      expect(organizationRepository.findById).toHaveBeenCalledWith(ORG_ID);
      expect(result).toEqual(org);
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findById.mockResolvedValue(null);

      await expect(service.getGeneralInfo(ORG_ID)).rejects.toThrow(AppException);
    });
  });

  describe('updateGeneralInfo', () => {
    it('partially updates only the provided fields', async () => {
      organizationRepository.findById.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue({
        _id: ORG_ID,
        name: 'FoundationHR',
        website: 'https://foundationhr.com',
      });

      const result = await service.updateGeneralInfo(ORG_ID, {
        name: 'FoundationHR',
        website: 'https://foundationhr.com',
      });

      expect(organizationRepository.updateById).toHaveBeenCalledWith(ORG_ID, {
        name: 'FoundationHR',
        website: 'https://foundationhr.com',
      });
      expect(result).toEqual({
        _id: ORG_ID,
        name: 'FoundationHR',
        website: 'https://foundationhr.com',
      });
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateGeneralInfo(ORG_ID, { name: 'FoundationHR' }),
      ).rejects.toThrow(AppException);
    });

    it('throws an error when the update fails', async () => {
      organizationRepository.findById.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue(null);

      await expect(
        service.updateGeneralInfo(ORG_ID, { name: 'FoundationHR' }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('getBusinessDetails', () => {
    it('returns the business details sub-document when present', async () => {
      const businessDetails = {
        legalName: 'FoundationHR Ltd',
        industry: 'Software',
        tax: { vatNumber: 'VN12345' },
      };
      organizationRepository.findById.mockResolvedValue({
        _id: ORG_ID,
        businessDetails,
      });

      const result = await service.getBusinessDetails(ORG_ID);

      expect(result).toEqual(businessDetails);
    });

    it('returns null when business details are not set', async () => {
      organizationRepository.findById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.getBusinessDetails(ORG_ID);

      expect(result).toBeNull();
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findById.mockResolvedValue(null);

      await expect(service.getBusinessDetails(ORG_ID)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('updateBusinessDetails', () => {
    it('saves a partial business details payload', async () => {
      organizationRepository.findById.mockResolvedValue({
        _id: ORG_ID,
        businessDetails: { industry: 'Software' },
      });
      organizationRepository.updateById.mockResolvedValue({
        _id: ORG_ID,
        businessDetails: {
          legalName: 'FoundationHR Ltd',
          industry: 'Software',
        },
      });

      const result = await service.updateBusinessDetails(ORG_ID, {
        legalName: 'FoundationHR Ltd',
      });

      expect(organizationRepository.updateById).toHaveBeenCalledWith(ORG_ID, {
        businessDetails: {
          industry: 'Software',
          legalName: 'FoundationHR Ltd',
        },
      });
      expect(result).toEqual({
        legalName: 'FoundationHR Ltd',
        industry: 'Software',
      });
    });

    it('merges nested tax details with existing values on partial updates', async () => {
      organizationRepository.findById.mockResolvedValue({
        _id: ORG_ID,
        businessDetails: {
          tax: {
            taxIdentificationNumber: 'TIN-0001',
            vatNumber: 'VN12345',
          },
        },
      });
      organizationRepository.updateById.mockResolvedValue({
        _id: ORG_ID,
        businessDetails: {
          tax: {
            taxIdentificationNumber: 'TIN-0001',
            vatNumber: 'VN99999',
          },
        },
      });

      const result = await service.updateBusinessDetails(ORG_ID, {
        tax: { vatNumber: 'VN99999' },
      });

      expect(organizationRepository.updateById).toHaveBeenCalledWith(ORG_ID, {
        businessDetails: {
          tax: {
            taxIdentificationNumber: 'TIN-0001',
            vatNumber: 'VN99999',
          },
        },
      });
      expect(result).toEqual({
        tax: {
          taxIdentificationNumber: 'TIN-0001',
          vatNumber: 'VN99999',
        },
      });
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateBusinessDetails(ORG_ID, { legalName: 'FoundationHR Ltd' }),
      ).rejects.toThrow(AppException);
    });

    it('throws an error when the update fails', async () => {
      organizationRepository.findById.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue(null);

      await expect(
        service.updateBusinessDetails(ORG_ID, { legalName: 'FoundationHR Ltd' }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('pending sections', () => {
    it.each([
      'getLocations',
      'getOrganisationHierarchy',
      'getPolicyManagement',
      'getBranding',
      'getDepartments',
      'getBilling',
    ])('%s returns an unimplemented placeholder', async (method) => {
      const result = await (service as any)[method](ORG_ID);

      expect(result).toEqual(
        expect.objectContaining({ organizationId: ORG_ID, implemented: false }),
      );
    });

    it.each([
      'updateLocations',
      'updateOrganisationHierarchy',
      'updatePolicyManagement',
      'updateBranding',
      'updateDepartments',
      'updateBilling',
    ])('%s returns an unimplemented placeholder with the payload', async (method) => {
      const payload = { key: 'value' };
      const result = await (service as any)[method](ORG_ID, payload);

      expect(result).toEqual(
        expect.objectContaining({
          organizationId: ORG_ID,
          implemented: false,
          receivedPayload: payload,
        }),
      );
    });
  });
});