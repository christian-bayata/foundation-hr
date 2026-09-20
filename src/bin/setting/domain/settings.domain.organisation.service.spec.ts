import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AppException } from '../../../common/response/app-exception';
import { OrganizationRepository } from '../../organization/repository/organization.repository';
import { EmployeeService } from '../../employee/employee.service';
import { BusinessType } from '../organisation/enum/organisation.enum';
import { SettingsDomainOrganisationService } from './settings.domain.organisation.service';

const ORG_ID = '64f1b2c3d4e5f678901234ab';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('SettingsDomainOrganisationService', () => {
  let service: SettingsDomainOrganisationService;
  let organizationRepository: {
    findById: jest.Mock<AnyPromiseFn>;
    updateById: jest.Mock<AnyPromiseFn>;
  };
  let employeeService: {
    listEmployees: jest.Mock<AnyPromiseFn>;
    updateSupervisor: jest.Mock<AnyPromiseFn>;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    organizationRepository = {
      findById: jest.fn(),
      updateById: jest.fn(),
    };

    employeeService = {
      listEmployees: jest.fn(),
      updateSupervisor: jest.fn(),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      providers: [
        SettingsDomainOrganisationService,
        { provide: OrganizationRepository, useValue: organizationRepository },
        { provide: EmployeeService, useValue: employeeService },
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
        businessType: 'private_limited',
        industry: 'Software',
        tin: 'TIN-0001',
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
    it('merges a partial payload into the existing business details', async () => {
      organizationRepository.findById.mockResolvedValue({
        _id: ORG_ID,
        businessDetails: { industry: 'Software' },
      });
      organizationRepository.updateById.mockResolvedValue({
        _id: ORG_ID,
        businessDetails: {
          businessType: BusinessType.PRIVATE_LIMITED,
          industry: 'Software',
        },
      });

      const result = await service.updateBusinessDetails(ORG_ID, {
        businessType: BusinessType.PRIVATE_LIMITED,
      });

      expect(organizationRepository.updateById).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({
          businessDetails: expect.objectContaining({
            businessType: BusinessType.PRIVATE_LIMITED,
            industry: 'Software',
          }),
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          businessType: BusinessType.PRIVATE_LIMITED,
          industry: 'Software',
        }),
      );
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateBusinessDetails(ORG_ID, {
          businessType: BusinessType.PRIVATE_LIMITED,
        }),
      ).rejects.toThrow(AppException);
    });

    it('throws an error when the update fails', async () => {
      organizationRepository.findById.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue(null);

      await expect(
        service.updateBusinessDetails(ORG_ID, {
          businessType: BusinessType.PRIVATE_LIMITED,
        }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('getLocations', () => {
    const locations = [
      {
        name: 'Headquarters',
        address: '123 Main Street, Suite 100, Lagos, Nigeria',
        phoneNumber: '+234 123 456 7890',
        email: 'info@company.com',
      },
      {
        name: 'Warehouse',
        address: '67 Industrial Park, Ikeja, Lagos, Nigeria',
        phoneNumber: '+234 234 567 8901',
        email: 'warehouse@company.com',
      },
    ];

    it('returns all locations when no search term is provided', async () => {
      organizationRepository.findById.mockResolvedValue({
        _id: ORG_ID,
        locations,
      });

      const result = await service.getLocations(ORG_ID);

      expect(organizationRepository.findById).toHaveBeenCalledWith(ORG_ID);
      expect(result).toEqual(locations);
    });

    it('returns an empty array when locations are not set', async () => {
      organizationRepository.findById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.getLocations(ORG_ID);

      expect(result).toEqual([]);
    });

    it('filters locations case-insensitively by name or email', async () => {
      organizationRepository.findById.mockResolvedValue({
        _id: ORG_ID,
        locations,
      });

      const byName = await service.getLocations(ORG_ID, 'warehouse');
      const byEmail = await service.getLocations(ORG_ID, 'INFO@COMPANY.COM');

      expect(byName).toEqual([locations[1]]);
      expect(byEmail).toEqual([locations[0]]);
    });

    it('returns an empty array when no location matches the search term', async () => {
      organizationRepository.findById.mockResolvedValue({
        _id: ORG_ID,
        locations,
      });

      const result = await service.getLocations(ORG_ID, 'not-a-location');

      expect(result).toEqual([]);
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findById.mockResolvedValue(null);

      await expect(service.getLocations(ORG_ID)).rejects.toThrow(AppException);
    });
  });

  describe('updateLocations', () => {
    it('replaces the locations list with the submitted payload', async () => {
      const incoming = [
        {
          name: 'Headquarters',
          address: '123 Main Street, Lagos, Nigeria',
          phoneNumber: '+234 123 456 7890',
          email: 'info@company.com',
        },
      ];
      organizationRepository.findById.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue({
        _id: ORG_ID,
        locations: incoming,
      });

      const result = await service.updateLocations(ORG_ID, {
        locations: incoming,
      });

      expect(organizationRepository.updateById).toHaveBeenCalledWith(ORG_ID, {
        locations: incoming,
      });
      expect(result).toEqual(incoming);
    });

    it('clears locations when the payload is empty', async () => {
      organizationRepository.findById.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue({
        _id: ORG_ID,
        locations: [],
      });

      const result = await service.updateLocations(ORG_ID, { locations: [] });

      expect(organizationRepository.updateById).toHaveBeenCalledWith(ORG_ID, {
        locations: [],
      });
      expect(result).toEqual([]);
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateLocations(ORG_ID, { locations: [] }),
      ).rejects.toThrow(AppException);
    });

    it('throws an error when the update fails', async () => {
      organizationRepository.findById.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue(null);

      await expect(
        service.updateLocations(ORG_ID, { locations: [] }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('getOrganisationHierarchy', () => {
    it('delegates to the employee service scoped to the organization', async () => {
      const employees = [
        {
          _id: 'emp1',
          firstName: 'Priscilla',
          lastName: 'Jobi',
          jobTitle: 'Art director',
          supervisor: null,
        },
      ];
      employeeService.listEmployees.mockResolvedValue({
        data: employees,
        count: 1,
      });

      const result = await service.getOrganisationHierarchy(ORG_ID, {
        search: 'job',
        department: 'Design',
        role: 'Art director',
        supervisorId: 'emp2',
        batch: 2,
        limit: 25,
      });

      expect(employeeService.listEmployees).toHaveBeenCalledWith({
        q: 'job',
        department: 'Design',
        jobTitle: 'Art director',
        supervisorId: 'emp2',
        batch: 2,
        limit: 25,
        organizationId: ORG_ID,
      });
      expect(result).toEqual({ data: employees, count: 1 });
    });

    it('maps no role filter to an empty query', async () => {
      employeeService.listEmployees.mockResolvedValue({ data: [], count: 0 });

      await service.getOrganisationHierarchy(ORG_ID, {});

      expect(employeeService.listEmployees).toHaveBeenCalledWith({
        q: undefined,
        department: undefined,
        jobTitle: undefined,
        supervisorId: undefined,
        batch: undefined,
        limit: undefined,
        organizationId: ORG_ID,
      });
    });
  });

  describe('updateOrganisationHierarchy', () => {
    it('delegates the reassignment to the employee service', async () => {
      const updated = {
        _id: 'emp1',
        firstName: 'Priscilla',
        lastName: 'Jobi',
        supervisor: 'emp2',
      };
      employeeService.updateSupervisor.mockResolvedValue(updated);

      const result = await service.updateOrganisationHierarchy(ORG_ID, {
        employeeId: 'emp1',
        supervisorId: 'emp2',
      });

      expect(employeeService.updateSupervisor).toHaveBeenCalledWith(
        'emp1',
        'emp2',
        ORG_ID,
      );
      expect(result).toEqual(updated);
    });

    it('passes null through when no supervisor is provided', async () => {
      const updated = { _id: 'emp1', supervisor: null };
      employeeService.updateSupervisor.mockResolvedValue(updated);

      await service.updateOrganisationHierarchy(ORG_ID, { employeeId: 'emp1' });

      expect(employeeService.updateSupervisor).toHaveBeenCalledWith(
        'emp1',
        null,
        ORG_ID,
      );
    });

    it('propagates employee service errors', async () => {
      employeeService.updateSupervisor.mockRejectedValue(
        new AppException({
          message: 'Supervisor not found',
          status: 404,
        } as any),
      );

      await expect(
        service.updateOrganisationHierarchy(ORG_ID, {
          employeeId: 'emp1',
          supervisorId: 'missing',
        }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('pending sections', () => {
    it.each([
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