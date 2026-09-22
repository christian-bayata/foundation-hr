import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AppException } from '../../../common/response/app-exception';
import { OrganizationRepository } from '../../organization/repository/organization.repository';
import { OrganizationDepartmentRepository } from '../../organization/repository/organization-department.repository';
import { EmployeeService } from '../../employee/employee.service';
import { EmployeeRepository } from '../../employee/repository/employee.repository';
import { BusinessType } from '../organisation/enum/organisation.enum';
import { AuthUtility } from '../../auth/auth.utility';
import { SettingsDomainOrganisationService } from './settings.domain.organisation.service';

const ORG_ID = '64f1b2c3d4e5f678901234ab';
const DIRECTOR_ID = '64f1b2c3d4e5f678901234ba';
const HOD_ID = '64f1b2c3d4e5f678901234c1';
const OPERATIONS_ID = '64f1b2c3d4e5f678901234c2';
const LEGAL_ID = '64f1b2c3d4e5f678901234c3';

type AnyPromiseFn = (...args: any[]) => Promise<any>;

describe('SettingsDomainOrganisationService', () => {
  let service: SettingsDomainOrganisationService;
  let organizationRepository: {
    findOrg: jest.Mock<AnyPromiseFn>;
    updateById: jest.Mock<AnyPromiseFn>;
  };
  let organizationDepartmentRepository: {
    findByOrganization: jest.Mock<AnyPromiseFn>;
    findByCode: jest.Mock<AnyPromiseFn>;
    updateByCode: jest.Mock<AnyPromiseFn>;
    synchronizeDepartments: jest.Mock<AnyPromiseFn>;
  };
  let employeeService: {
    listEmployees: jest.Mock<AnyPromiseFn>;
    getOrganisationHierarchy: jest.Mock<AnyPromiseFn>;
    updateSupervisor: jest.Mock<AnyPromiseFn>;
  };
  let employeeRepository: {
    findByOrganization: jest.Mock<AnyPromiseFn>;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    organizationRepository = {
      findOrg: jest.fn(),
      updateById: jest.fn(),
    };

    organizationDepartmentRepository = {
      findByOrganization: jest.fn(),
      findByCode: jest.fn(),
      updateByCode: jest.fn(),
      synchronizeDepartments: jest.fn(),
    };

    employeeService = {
      listEmployees: jest.fn(),
      getOrganisationHierarchy: jest.fn(),
      updateSupervisor: jest.fn(),
    };

    employeeRepository = {
      findByOrganization: jest.fn(),
    };

    const { Test } = await import('@nestjs/testing');
    const module = await Test.createTestingModule({
      providers: [
        SettingsDomainOrganisationService,
        { provide: OrganizationRepository, useValue: organizationRepository },
        {
          provide: OrganizationDepartmentRepository,
          useValue: organizationDepartmentRepository,
        },
        { provide: EmployeeService, useValue: employeeService },
        { provide: EmployeeRepository, useValue: employeeRepository },
        {
          provide: AuthUtility,
          useValue: { generateRandomString: jest.fn(() => 'generated-code') },
        },
      ],
    }).compile();

    service = module.get<SettingsDomainOrganisationService>(
      SettingsDomainOrganisationService,
    );
  });

  describe('getGeneralInfo', () => {
    it('returns the organization general information when found', async () => {
      const org = { _id: ORG_ID, name: 'FoundationHR' };
      organizationRepository.findOrg.mockResolvedValue(org);

      const result = await service.getGeneralInfo(ORG_ID);

      expect(organizationRepository.findOrg).toHaveBeenCalledWith({
        _id: ORG_ID,
      });
      expect(result).toEqual(org);
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(service.getGeneralInfo(ORG_ID)).rejects.toThrow(AppException);
    });
  });

  describe('updateGeneralInfo', () => {
    it('partially updates only the provided fields', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
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
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.updateGeneralInfo(ORG_ID, { name: 'FoundationHR' }),
      ).rejects.toThrow(AppException);
    });

    it('throws an error when the update fails', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
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
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        businessDetails,
      });

      const result = await service.getBusinessDetails(ORG_ID);

      expect(result).toEqual(businessDetails);
    });

    it('returns null when business details are not set', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      const result = await service.getBusinessDetails(ORG_ID);

      expect(result).toBeNull();
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(service.getBusinessDetails(ORG_ID)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('updateBusinessDetails', () => {
    it('merges a partial payload into the existing business details', async () => {
      organizationRepository.findOrg.mockResolvedValue({
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
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.updateBusinessDetails(ORG_ID, {
          businessType: BusinessType.PRIVATE_LIMITED,
        }),
      ).rejects.toThrow(AppException);
    });

    it('throws an error when the update fails', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
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
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        locations,
      });

      const result = await service.getLocations(ORG_ID);

      expect(organizationRepository.findOrg).toHaveBeenCalledWith({
        _id: ORG_ID,
      });
      expect(result).toEqual(locations);
    });

    it('returns an empty array when locations are not set', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      const result = await service.getLocations(ORG_ID);

      expect(result).toEqual([]);
    });

    it('filters locations case-insensitively by name or email', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        locations,
      });

      const byName = await service.getLocations(ORG_ID, 'warehouse');
      const byEmail = await service.getLocations(ORG_ID, 'INFO@COMPANY.COM');

      expect(byName).toEqual([locations[1]]);
      expect(byEmail).toEqual([locations[0]]);
    });

    it('returns an empty array when no location matches the search term', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        locations,
      });

      const result = await service.getLocations(ORG_ID, 'not-a-location');

      expect(result).toEqual([]);
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

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
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
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
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
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
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.updateLocations(ORG_ID, { locations: [] }),
      ).rejects.toThrow(AppException);
    });

    it('throws an error when the update fails', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue(null);

      await expect(
        service.updateLocations(ORG_ID, { locations: [] }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('getOrganisationHierarchy', () => {
    it('delegates to the employee service scoped to the organization', async () => {
      const hierarchy = [
        {
          _id: 'emp1',
          firstName: 'Priscilla',
          lastName: 'Jobi',
          jobTitle: 'Art director',
          supervisor: null,
          children: [],
        },
      ];
      employeeService.getOrganisationHierarchy.mockResolvedValue(hierarchy);

      const result = await service.getOrganisationHierarchy(ORG_ID);

      expect(employeeService.getOrganisationHierarchy).toHaveBeenCalledWith(
        ORG_ID,
      );
      expect(result).toEqual(hierarchy);
    });

    it('returns an empty array when the organization has no employees', async () => {
      employeeService.getOrganisationHierarchy.mockResolvedValue([]);

      const result = await service.getOrganisationHierarchy(ORG_ID);

      expect(employeeService.getOrganisationHierarchy).toHaveBeenCalledWith(
        ORG_ID,
      );
      expect(result).toEqual([]);
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

  describe('getBranding', () => {
    it('returns the branding sub-document when present', async () => {
      const branding = {
        logoUrl: 'https://cdn.example.com/logo.png',
        navigationBackgroundColor: '#FAFDFF',
        buttonColor: '#1E88E5',
        customDomains: ['@foundationhr.com'],
        loginPageImages: ['https://cdn.example.com/login-hero.png'],
      };
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        branding,
      });

      const result = await service.getBranding(ORG_ID);

      expect(organizationRepository.findOrg).toHaveBeenCalledWith({
        _id: ORG_ID,
      });
      expect(result).toEqual(branding);
    });

    it('returns null when branding is not set', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      const result = await service.getBranding(ORG_ID);

      expect(result).toBeNull();
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(service.getBranding(ORG_ID)).rejects.toThrow(AppException);
    });
  });

  describe('updateBranding', () => {
    const existingBranding = {
      logoUrl: 'https://cdn.example.com/logo.png',
      navigationBackgroundColor: '#FAFDFF',
      buttonColor: '#1E88E5',
      customDomains: ['@foundationhr.com'],
      loginPageImages: ['https://cdn.example.com/login-hero.png'],
    };

    it('merges a partial payload into the existing branding', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        branding: existingBranding,
      });
      organizationRepository.updateById.mockResolvedValue({
        _id: ORG_ID,
        branding: { ...existingBranding, buttonColor: '#43A047' },
      });

      const result = await service.updateBranding(ORG_ID, {
        buttonColor: '#43A047',
      });

      expect(organizationRepository.updateById).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({
          branding: expect.objectContaining({
            ...existingBranding,
            buttonColor: '#43A047',
          }),
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          ...existingBranding,
          buttonColor: '#43A047',
        }),
      );
    });

    it('replaces array fields with the submitted payload', async () => {
      const customDomains = ['@foundationhr.com', '@foundationhr.co.uk'];
      const loginPageImages = [
        'https://cdn.example.com/login-1.png',
        'https://cdn.example.com/login-2.png',
      ];
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        branding: existingBranding,
      });
      organizationRepository.updateById.mockResolvedValue({
        _id: ORG_ID,
        branding: { ...existingBranding, customDomains, loginPageImages },
      });

      const result = await service.updateBranding(ORG_ID, {
        customDomains,
        loginPageImages,
      });

      expect(organizationRepository.updateById).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({
          branding: expect.objectContaining({ customDomains, loginPageImages }),
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ customDomains, loginPageImages }),
      );
    });

    it('clears the logo when logoUrl is explicitly null', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        branding: existingBranding,
      });
      organizationRepository.updateById.mockResolvedValue({
        _id: ORG_ID,
        branding: { ...existingBranding, logoUrl: null },
      });

      const result = await service.updateBranding(ORG_ID, { logoUrl: null });

      expect(organizationRepository.updateById).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({
          branding: expect.objectContaining({ logoUrl: null }),
        }),
      );
      expect(result).toEqual(expect.objectContaining({ logoUrl: null }));
    });

    it('seeds defaults when branding has never been saved', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue({
        _id: ORG_ID,
        branding: {
          logoUrl: null,
          navigationBackgroundColor: '#FAFDFF',
          buttonColor: null,
          customDomains: [],
          loginPageImages: [],
        },
      });

      await service.updateBranding(ORG_ID, {
        navigationBackgroundColor: '#FAFDFF',
      });

      expect(organizationRepository.updateById).toHaveBeenCalledWith(ORG_ID, {
        branding: {
          logoUrl: null,
          navigationBackgroundColor: '#FAFDFF',
          buttonColor: null,
          customDomains: [],
          loginPageImages: [],
        },
      });
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.updateBranding(ORG_ID, { buttonColor: '#43A047' }),
      ).rejects.toThrow(AppException);
    });

    it('throws an error when the update fails', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue(null);

      await expect(
        service.updateBranding(ORG_ID, { buttonColor: '#43A047' }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('getDepartments', () => {
    const departments = [
      {
        _id: OPERATIONS_ID,
        code: 'operations',
        name: 'Operations',
        headOfDepartmentId: null,
        parentDepartmentId: null,
      },
      {
        _id: HOD_ID,
        code: 'logistics',
        name: 'Logistics & Distribution',
        headOfDepartmentId: DIRECTOR_ID,
        parentDepartmentId: OPERATIONS_ID,
      },
    ];

    it('returns all departments when no search term is provided', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationDepartmentRepository.findByOrganization.mockResolvedValue(
        departments,
      );
      employeeRepository.findByOrganization.mockResolvedValue([
        { _id: DIRECTOR_ID, firstName: 'James', lastName: 'Oladokun' },
      ]);

      const result = await service.getDepartments(ORG_ID);

      expect(organizationDepartmentRepository.findByOrganization).toHaveBeenCalledWith(
        ORG_ID,
      );
      expect(result).toEqual([
        {
          ...departments[0],
          headOfDepartmentName: null,
          parentDepartmentName: null,
        },
        {
          ...departments[1],
          headOfDepartmentName: 'James Oladokun',
          parentDepartmentName: 'Operations',
        },
      ]);
    });

    it('returns an empty array when departments are not set', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationDepartmentRepository.findByOrganization.mockResolvedValue([]);

      const result = await service.getDepartments(ORG_ID);

      expect(result).toEqual([]);
      expect(employeeRepository.findByOrganization).not.toHaveBeenCalled();
    });

    it('filters departments case-insensitively by name', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationDepartmentRepository.findByOrganization.mockResolvedValue(
        departments,
      );
      employeeRepository.findByOrganization.mockResolvedValue([
        { _id: DIRECTOR_ID, firstName: 'James', lastName: 'Oladokun' },
      ]);

      const result = await service.getDepartments(ORG_ID, 'LOGISTICS');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Logistics & Distribution');
    });

    it('returns an empty array when no department matches the search term', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationDepartmentRepository.findByOrganization.mockResolvedValue(
        departments,
      );

      const result = await service.getDepartments(ORG_ID, 'not-a-department');

      expect(result).toEqual([]);
    });

    it('resolves a null HOD name when the employee is missing', async () => {
      const loneDepartment = {
        _id: OPERATIONS_ID,
        code: 'operations',
        name: 'Operations',
        headOfDepartmentId: HOD_ID,
        parentDepartmentId: null,
      };
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationDepartmentRepository.findByOrganization.mockResolvedValue([
        loneDepartment,
      ]);
      employeeRepository.findByOrganization.mockResolvedValue([]);

      const result = await service.getDepartments(ORG_ID);

      expect(result[0].headOfDepartmentName).toBeNull();
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(service.getDepartments(ORG_ID)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('updateDepartments (single update by code)', () => {
    const CODE = 'IQGLWvbEIi';
    const FINANCE = {
      _id: OPERATIONS_ID,
      code: CODE,
      name: 'Finance',
      headOfDepartmentId: null,
      parentDepartmentId: null,
    };
    const LEGAL = {
      _id: LEGAL_ID,
      code: 'legal',
      name: 'Legal',
      headOfDepartmentId: null,
      parentDepartmentId: null,
    };
    const resetFindMocks = () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationDepartmentRepository.findByCode.mockResolvedValue(FINANCE);
      organizationDepartmentRepository.findByOrganization.mockResolvedValue([
        FINANCE,
      ]);
    };

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.updateDepartments(ORG_ID, CODE, { name: 'Finance' }),
      ).rejects.toThrow(AppException);

      expect(
        organizationDepartmentRepository.updateByCode,
      ).not.toHaveBeenCalled();
    });

    it('throws a 404 when no department matches the code', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationDepartmentRepository.findByCode.mockResolvedValue(null);

      await expect(
        service.updateDepartments(ORG_ID, 'missing', { name: 'Finance' }),
      ).rejects.toThrow(AppException);

      expect(
        organizationDepartmentRepository.updateByCode,
      ).not.toHaveBeenCalled();
    });

    it('partially updates only the provided fields', async () => {
      resetFindMocks();
      organizationDepartmentRepository.updateByCode.mockResolvedValue({
        ...FINANCE,
        headOfDepartmentId: DIRECTOR_ID,
      });

      const result = await service.updateDepartments(ORG_ID, CODE, {
        headOfDepartmentId: DIRECTOR_ID,
      });

      expect(organizationDepartmentRepository.updateByCode).toHaveBeenCalledWith(
        ORG_ID,
        CODE,
        { headOfDepartmentId: DIRECTOR_ID },
      );
      expect(result).toEqual({ ...FINANCE, headOfDepartmentId: DIRECTOR_ID });
    });

    it('updates the department name', async () => {
      resetFindMocks();
      organizationDepartmentRepository.updateByCode.mockResolvedValue({
        ...FINANCE,
        name: 'Finance & Accounting',
      });

      await service.updateDepartments(ORG_ID, CODE, {
        name: 'Finance & Accounting',
      });

      expect(organizationDepartmentRepository.updateByCode).toHaveBeenCalledWith(
        ORG_ID,
        CODE,
        { name: 'Finance & Accounting' },
      );
    });

    it('clears the head of department with an explicit null', async () => {
      resetFindMocks();
      organizationDepartmentRepository.findByCode.mockResolvedValue({
        ...FINANCE,
        headOfDepartmentId: DIRECTOR_ID,
      });
      organizationDepartmentRepository.findByOrganization.mockResolvedValue([
        { ...FINANCE, headOfDepartmentId: DIRECTOR_ID },
      ]);
      organizationDepartmentRepository.updateByCode.mockResolvedValue({
        ...FINANCE,
        headOfDepartmentId: null,
      });

      await service.updateDepartments(ORG_ID, CODE, {
        headOfDepartmentId: null,
      });

      expect(organizationDepartmentRepository.updateByCode).toHaveBeenCalledWith(
        ORG_ID,
        CODE,
        { headOfDepartmentId: null },
      );
    });

    it('resolves a parent department by code', async () => {
      resetFindMocks();
      organizationDepartmentRepository.findByOrganization.mockResolvedValue([
        FINANCE,
        LEGAL,
      ]);
      organizationDepartmentRepository.updateByCode.mockResolvedValue({
        ...FINANCE,
        parentDepartmentId: LEGAL_ID,
      });

      await service.updateDepartments(ORG_ID, CODE, { parentCode: 'legal' });

      expect(organizationDepartmentRepository.updateByCode).toHaveBeenCalledWith(
        ORG_ID,
        CODE,
        { parentDepartmentId: LEGAL_ID },
      );
    });

    it('resolves a parent department by name', async () => {
      resetFindMocks();
      organizationDepartmentRepository.findByOrganization.mockResolvedValue([
        FINANCE,
        LEGAL,
      ]);
      organizationDepartmentRepository.updateByCode.mockResolvedValue({
        ...FINANCE,
        parentDepartmentId: LEGAL_ID,
      });

      await service.updateDepartments(ORG_ID, CODE, { parentCode: 'Legal' });

      expect(organizationDepartmentRepository.updateByCode).toHaveBeenCalledWith(
        ORG_ID,
        CODE,
        { parentDepartmentId: LEGAL_ID },
      );
    });

    it('clears the parent with an explicit null parentCode', async () => {
      resetFindMocks();
      organizationDepartmentRepository.findByCode.mockResolvedValue({
        ...FINANCE,
        parentDepartmentId: LEGAL_ID,
      });
      organizationDepartmentRepository.findByOrganization.mockResolvedValue([
        { ...FINANCE, parentDepartmentId: LEGAL_ID },
        LEGAL,
      ]);
      organizationDepartmentRepository.updateByCode.mockResolvedValue({
        ...FINANCE,
        parentDepartmentId: null,
      });

      await service.updateDepartments(ORG_ID, CODE, { parentCode: null });

      expect(organizationDepartmentRepository.updateByCode).toHaveBeenCalledWith(
        ORG_ID,
        CODE,
        { parentDepartmentId: null },
      );
    });

    it('clears the parent when the parent code cannot be resolved', async () => {
      resetFindMocks();
      organizationDepartmentRepository.updateByCode.mockResolvedValue(FINANCE);

      await service.updateDepartments(ORG_ID, CODE, { parentCode: 'missing' });

      expect(organizationDepartmentRepository.updateByCode).toHaveBeenCalledWith(
        ORG_ID,
        CODE,
        { parentDepartmentId: null },
      );
    });

    it('clears the parent when the department is set as its own parent', async () => {
      resetFindMocks();
      organizationDepartmentRepository.updateByCode.mockResolvedValue(FINANCE);

      await service.updateDepartments(ORG_ID, CODE, { parentCode: CODE });

      expect(organizationDepartmentRepository.updateByCode).toHaveBeenCalledWith(
        ORG_ID,
        CODE,
        { parentDepartmentId: null },
      );
    });

    it('rejects a name that collides with another department', async () => {
      resetFindMocks();
      organizationDepartmentRepository.findByOrganization.mockResolvedValue([
        FINANCE,
        LEGAL,
      ]);

      await expect(
        service.updateDepartments(ORG_ID, CODE, { name: 'legal' }),
      ).rejects.toThrow(AppException);

      expect(
        organizationDepartmentRepository.updateByCode,
      ).not.toHaveBeenCalled();
    });

    it('keeps the current name without treating itself as a collision', async () => {
      resetFindMocks();
      organizationDepartmentRepository.updateByCode.mockResolvedValue(FINANCE);

      await service.updateDepartments(ORG_ID, CODE, { name: 'Finance' });

      expect(organizationDepartmentRepository.updateByCode).toHaveBeenCalledWith(
        ORG_ID,
        CODE,
        { name: 'Finance' },
      );
    });

    it('throws a 500 when the update returns no document', async () => {
      resetFindMocks();
      organizationDepartmentRepository.updateByCode.mockResolvedValue(null);

      await expect(
        service.updateDepartments(ORG_ID, CODE, { name: 'Finance' }),
      ).rejects.toThrow(AppException);
    });

    it('propagates errors thrown while updating the department', async () => {
      resetFindMocks();
      organizationDepartmentRepository.updateByCode.mockRejectedValue(
        new AppException('boom', 500),
      );

      await expect(
        service.updateDepartments(ORG_ID, CODE, { name: 'Finance' }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('pending sections', () => {
    it.each(['getPolicyManagement', 'getBilling'])(
      '%s returns an unimplemented placeholder',
      async (method) => {
        const result = await (service as any)[method](ORG_ID);

        expect(result).toEqual(
          expect.objectContaining({
            organizationId: ORG_ID,
            implemented: false,
          }),
        );
      },
    );

    it.each(['updatePolicyManagement', 'updateBilling'])(
      '%s returns an unimplemented placeholder with the payload',
      async (method) => {
        const payload = { key: 'value' };
        const result = await (service as any)[method](ORG_ID, payload);

        expect(result).toEqual(
          expect.objectContaining({
            organizationId: ORG_ID,
            implemented: false,
            receivedPayload: payload,
          }),
        );
      },
    );
  });
});