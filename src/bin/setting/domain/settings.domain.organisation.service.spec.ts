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

  describe('pending sections', () => {
    it.each([
      'getBusinessDetails',
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
      'updateBusinessDetails',
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