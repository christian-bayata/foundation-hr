import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Types } from 'mongoose';
import { AppException } from '../../../common/response/app-exception';
import { OrganizationRepository } from '../../organization/repository/organization.repository';
import { OrganizationDepartmentRepository } from '../../organization/repository/organization-department.repository';
import { JobTitleRepository } from '../../organization/repository/job-title.repository';
import { EmployeeService } from '../../employee/employee.service';
import { EmployeeRepository } from '../../employee/repository/employee.repository';
import { BusinessType } from '../organisation/enum/organisation.enum';
import { InvoiceRepository } from '../organisation/repository/invoice.repository';
import { OrganizationPolicyRepository } from '../organisation/repository/organization-policy.repository';
import { FileUploadService } from '../../../file-upload/file-upload.service';
import { AuthUtility } from '../../auth/auth.utility';
import {
  DEFAULT_EMPLOYEE_PROFILE_SETTINGS,
  DEFAULT_EMPLOYEE_WORKFLOW_SETTINGS,
  DEFAULT_LEAVE_ENTITLEMENT_SETTINGS,
  DEFAULT_LEAVE_MANAGEMENT_SETTINGS,
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_OFFBOARDING_SETTINGS,
  SettingsDomainOrganisationService,
} from './settings.domain.organisation.service';
import {
  DueDate,
  EmploymentType,
  ResponsibleParty,
} from '../employee-profiles/enum/employee-profile.enum';
import { RequestType } from '../request-management/enum/request-management.enum';
import {
  ApprovalDeadline,
  LeaveAllocationMethod,
} from '../leave-management/enum/leave-management.enum';

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
  let jobTitleRepository: {
    findByOrganization: jest.Mock<AnyPromiseFn>;
    findByCode: jest.Mock<AnyPromiseFn>;
    create: jest.Mock<AnyPromiseFn>;
    updateByCode: jest.Mock<AnyPromiseFn>;
    deleteWhere: jest.Mock<AnyPromiseFn>;
  };
  let employeeService: {
    listEmployees: jest.Mock<AnyPromiseFn>;
    getOrganisationHierarchy: jest.Mock<AnyPromiseFn>;
    updateSupervisor: jest.Mock<AnyPromiseFn>;
  };
  let employeeRepository: {
    findByOrganization: jest.Mock<AnyPromiseFn>;
  };
  let invoiceRepository: {
    findByOrganization: jest.Mock<AnyPromiseFn>;
  };
  let organizationPolicyRepository: {
    findByOrganization: jest.Mock<AnyPromiseFn>;
    findByCode: jest.Mock<AnyPromiseFn>;
    create: jest.Mock<AnyPromiseFn>;
    updateByCode: jest.Mock<AnyPromiseFn>;
    deleteWhere: jest.Mock<AnyPromiseFn>;
  };
  let fileUploadService: {
    deleteAsset: jest.Mock<AnyPromiseFn>;
    derivePublicId: jest.Mock;
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

    jobTitleRepository = {
      findByOrganization: jest.fn(),
      findByCode: jest.fn(),
      create: jest.fn(),
      updateByCode: jest.fn(),
      deleteWhere: jest.fn(),
    };

    employeeRepository = {
      findByOrganization: jest.fn(),
    };

    invoiceRepository = {
      findByOrganization: jest.fn(),
    };

    organizationPolicyRepository = {
      findByOrganization: jest.fn(),
      findByCode: jest.fn(),
      create: jest.fn(),
      updateByCode: jest.fn(),
      deleteWhere: jest.fn(),
    };

    fileUploadService = {
      deleteAsset: jest.fn(),
      derivePublicId: jest.fn(),
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
        { provide: JobTitleRepository, useValue: jobTitleRepository },
        { provide: InvoiceRepository, useValue: invoiceRepository },
        {
          provide: OrganizationPolicyRepository,
          useValue: organizationPolicyRepository,
        },
        { provide: FileUploadService, useValue: fileUploadService },
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

      await expect(service.getGeneralInfo(ORG_ID)).rejects.toThrow(
        AppException,
      );
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

      expect(
        organizationDepartmentRepository.findByOrganization,
      ).toHaveBeenCalledWith(ORG_ID);
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

      expect(
        organizationDepartmentRepository.updateByCode,
      ).toHaveBeenCalledWith(ORG_ID, CODE, { headOfDepartmentId: DIRECTOR_ID });
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

      expect(
        organizationDepartmentRepository.updateByCode,
      ).toHaveBeenCalledWith(ORG_ID, CODE, { name: 'Finance & Accounting' });
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

      expect(
        organizationDepartmentRepository.updateByCode,
      ).toHaveBeenCalledWith(ORG_ID, CODE, { headOfDepartmentId: null });
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

      expect(
        organizationDepartmentRepository.updateByCode,
      ).toHaveBeenCalledWith(ORG_ID, CODE, { parentDepartmentId: LEGAL_ID });
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

      expect(
        organizationDepartmentRepository.updateByCode,
      ).toHaveBeenCalledWith(ORG_ID, CODE, { parentDepartmentId: LEGAL_ID });
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

      expect(
        organizationDepartmentRepository.updateByCode,
      ).toHaveBeenCalledWith(ORG_ID, CODE, { parentDepartmentId: null });
    });

    it('clears the parent when the parent code cannot be resolved', async () => {
      resetFindMocks();
      organizationDepartmentRepository.updateByCode.mockResolvedValue(FINANCE);

      await service.updateDepartments(ORG_ID, CODE, { parentCode: 'missing' });

      expect(
        organizationDepartmentRepository.updateByCode,
      ).toHaveBeenCalledWith(ORG_ID, CODE, { parentDepartmentId: null });
    });

    it('clears the parent when the department is set as its own parent', async () => {
      resetFindMocks();
      organizationDepartmentRepository.updateByCode.mockResolvedValue(FINANCE);

      await service.updateDepartments(ORG_ID, CODE, { parentCode: CODE });

      expect(
        organizationDepartmentRepository.updateByCode,
      ).toHaveBeenCalledWith(ORG_ID, CODE, { parentDepartmentId: null });
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

      expect(
        organizationDepartmentRepository.updateByCode,
      ).toHaveBeenCalledWith(ORG_ID, CODE, { name: 'Finance' });
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

  describe('getBilling', () => {
    it('returns the billing sub-document when present', async () => {
      const billing = {
        plan: {
          name: 'Basic plan',
          interval: 'monthly',
          description: 'Our most popular plan for small teams.',
          priceAmount: 10,
          priceCurrency: 'USD',
          seatsUsed: 14,
          seatsLimit: 20,
        },
        paymentMethod: {
          brand: 'visa',
          last4: '1234',
          expiry: '06/2024',
        },
        billingEmail: 'billing@foundation.com',
      };
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        billing,
      });

      const result = await service.getBilling(ORG_ID);

      expect(organizationRepository.findOrg).toHaveBeenCalledWith({
        _id: ORG_ID,
      });
      expect(result).toEqual(billing);
    });

    it('returns the default plan when billing is not set', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      const result = await service.getBilling(ORG_ID);

      expect(result).toEqual({
        plan: expect.objectContaining({
          name: 'Basic plan',
          interval: 'monthly',
          priceAmount: 10,
          priceCurrency: 'USD',
        }),
        paymentMethod: null,
        billingEmail: null,
      });
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(service.getBilling(ORG_ID)).rejects.toThrow(AppException);
    });
  });

  describe('updateBilling', () => {
    const existingBilling = {
      plan: {
        name: 'Basic plan',
        interval: 'monthly',
        description: 'Our most popular plan for small teams.',
        priceAmount: 10,
        priceCurrency: 'USD',
        seatsUsed: 14,
        seatsLimit: 20,
      },
      paymentMethod: {
        brand: 'visa',
        last4: '1234',
        expiry: '06/2024',
      },
      billingEmail: 'billing@foundation.com',
    };

    it('merges a partial payload into the existing billing', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        billing: existingBilling,
      });
      organizationRepository.updateById.mockResolvedValue({
        _id: ORG_ID,
        billing: {
          ...existingBilling,
          billingEmail: 'finance@foundation.com',
        },
      });

      const result = await service.updateBilling(ORG_ID, {
        billingEmail: 'finance@foundation.com',
      });

      expect(organizationRepository.updateById).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({
          billing: expect.objectContaining({
            ...existingBilling,
            billingEmail: 'finance@foundation.com',
          }),
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          ...existingBilling,
          billingEmail: 'finance@foundation.com',
        }),
      );
    });

    it('merges nested payment method fields without dropping the rest', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        billing: existingBilling,
      });
      organizationRepository.updateById.mockResolvedValue({
        _id: ORG_ID,
        billing: {
          ...existingBilling,
          paymentMethod: {
            ...existingBilling.paymentMethod,
            expiry: '12/2026',
          },
        },
      });

      const result = await service.updateBilling(ORG_ID, {
        paymentMethod: { expiry: '12/2026' },
      });

      expect(organizationRepository.updateById).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({
          billing: expect.objectContaining({
            billingEmail: existingBilling.billingEmail,
            paymentMethod: expect.objectContaining({
              brand: 'visa',
              last4: '1234',
              expiry: '12/2026',
            }),
          }),
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          paymentMethod: expect.objectContaining({ expiry: '12/2026' }),
        }),
      );
    });

    it('creates a default plan when billing is absent on the organization', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue({
        _id: ORG_ID,
        billing: {
          plan: {
            name: 'Basic plan',
          },
          paymentMethod: null,
          billingEmail: 'finance@foundation.com',
        },
      });

      const result = await service.updateBilling(ORG_ID, {
        billingEmail: 'finance@foundation.com',
      });

      expect(organizationRepository.updateById).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({
          billing: expect.objectContaining({
            plan: expect.objectContaining({ name: 'Basic plan' }),
            paymentMethod: null,
          }),
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ billingEmail: 'finance@foundation.com' }),
      );
    });

    it('clears the billing email when it is explicitly null', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        billing: existingBilling,
      });
      organizationRepository.updateById.mockResolvedValue({
        _id: ORG_ID,
        billing: { ...existingBilling, billingEmail: null },
      });

      const result = await service.updateBilling(ORG_ID, {
        billingEmail: null,
      });

      expect(result).toEqual(expect.objectContaining({ billingEmail: null }));
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.updateBilling(ORG_ID, { billingEmail: 'test@foundation.com' }),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });

    it('throws a 500 when the update fails', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue(null);

      await expect(
        service.updateBilling(ORG_ID, { billingEmail: 'test@foundation.com' }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('getInvoices', () => {
    it('returns the organization invoices scoped to the organization', async () => {
      const invoices = [
        {
          _id: '64f1b2c3d4e5f678901234e1',
          organizationId: ORG_ID,
          invoiceNumber: '007',
          billingDate: 'Dec 1, 2023',
          status: 'paid',
          amount: 10,
          currency: 'USD',
          planName: 'Basic plan',
        },
        {
          _id: '64f1b2c3d4e5f678901234e2',
          organizationId: ORG_ID,
          invoiceNumber: '006',
          billingDate: 'Nov 1, 2023',
          status: 'paid',
          amount: 10,
          currency: 'USD',
          planName: 'Basic plan',
        },
      ];
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      invoiceRepository.findByOrganization.mockResolvedValue(invoices);

      const result = await service.getInvoices(ORG_ID);

      expect(invoiceRepository.findByOrganization).toHaveBeenCalledWith(
        ORG_ID,
        undefined,
      );
      expect(result).toEqual(invoices);
    });

    it('forwards the search term to the repository', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      invoiceRepository.findByOrganization.mockResolvedValue([]);

      const result = await service.getInvoices(ORG_ID, '007');

      expect(invoiceRepository.findByOrganization).toHaveBeenCalledWith(
        ORG_ID,
        '007',
      );
      expect(result).toEqual([]);
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(service.getInvoices(ORG_ID)).rejects.toThrow(AppException);
      expect(invoiceRepository.findByOrganization).not.toHaveBeenCalled();
    });
  });

  describe('getPolicyManagement', () => {
    it('returns policy documents with the search filter', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      const documents = [{ code: 'pol-1', name: 'HR Handbook' }];
      organizationPolicyRepository.findByOrganization.mockResolvedValue(
        documents,
      );

      const result = await service.getPolicyManagement(ORG_ID, 'handbook');

      expect(
        organizationPolicyRepository.findByOrganization,
      ).toHaveBeenCalledWith(ORG_ID, 'handbook');
      expect(result).toEqual(documents);
    });

    it('defaults the search filter to an empty string', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationPolicyRepository.findByOrganization.mockResolvedValue([]);

      await service.getPolicyManagement(ORG_ID);

      expect(
        organizationPolicyRepository.findByOrganization,
      ).toHaveBeenCalledWith(ORG_ID, '');
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(service.getPolicyManagement(ORG_ID)).rejects.toThrow(
        AppException,
      );
      expect(
        organizationPolicyRepository.findByOrganization,
      ).not.toHaveBeenCalled();
    });
  });

  describe('addPolicy', () => {
    const dto = {
      name: '  HR Handbook  ',
      url: 'https://res.cloudinary.com/demo/raw/upload/v1700000000/foundationhr/documents/hr-handbook.pdf',
    };

    it('creates a policy document with a generated code, derived public id and uploader', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      fileUploadService.derivePublicId.mockReturnValue(
        'foundationhr/documents/hr-handbook.pdf',
      );
      organizationPolicyRepository.create.mockResolvedValue({
        code: 'generated-code',
        name: 'HR Handbook',
      });

      const result = await service.addPolicy(ORG_ID, dto, {
        userId: 'usr123',
        email: 'admin@example.com',
      });

      expect(fileUploadService.derivePublicId).toHaveBeenCalledWith(dto.url);
      expect(organizationPolicyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: ORG_ID,
          code: 'generated-code',
          name: 'HR Handbook',
          url: dto.url,
          publicId: 'foundationhr/documents/hr-handbook.pdf',
          uploadedByUserId: 'usr123',
          uploadedByEmail: 'admin@example.com',
        }),
      );
      expect(result).toEqual({ code: 'generated-code', name: 'HR Handbook' });
    });

    it('rejects an empty document name', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      await expect(
        service.addPolicy(ORG_ID, { ...dto, name: '   ' }),
      ).rejects.toThrow(AppException);
      expect(organizationPolicyRepository.create).not.toHaveBeenCalled();
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(service.addPolicy(ORG_ID, dto)).rejects.toThrow(
        AppException,
      );
      expect(organizationPolicyRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updatePolicy', () => {
    it('renames an existing document', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationPolicyRepository.findByCode.mockResolvedValue({
        code: 'pol-1',
      });
      organizationPolicyRepository.updateByCode.mockResolvedValue({
        code: 'pol-1',
        name: 'Employee Handbook',
      });

      const result = await service.updatePolicy(ORG_ID, 'pol-1', {
        name: '  Employee Handbook  ',
      });

      expect(organizationPolicyRepository.updateByCode).toHaveBeenCalledWith(
        ORG_ID,
        'pol-1',
        {
          name: 'Employee Handbook',
        },
      );
      expect(result).toEqual({ code: 'pol-1', name: 'Employee Handbook' });
    });

    it('throws a 404 when the document does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationPolicyRepository.findByCode.mockResolvedValue(null);

      await expect(
        service.updatePolicy(ORG_ID, 'missing', { name: 'X' }),
      ).rejects.toThrow(AppException);
      expect(organizationPolicyRepository.updateByCode).not.toHaveBeenCalled();
    });
  });

  describe('deletePolicy', () => {
    it('deletes the document and removes its stored asset', async () => {
      organizationPolicyRepository.findByCode.mockResolvedValue({
        code: 'pol-1',
        publicId: 'foundationhr/documents/hr-handbook',
      });
      organizationPolicyRepository.deleteWhere.mockResolvedValue({
        code: 'pol-1',
      });

      const result = await service.deletePolicy(ORG_ID, 'pol-1');

      expect(organizationPolicyRepository.deleteWhere).toHaveBeenCalledWith({
        organizationId: ORG_ID,
        code: 'pol-1',
      });
      expect(fileUploadService.deleteAsset).toHaveBeenCalledWith(
        'foundationhr/documents/hr-handbook',
        'documents',
      );
      expect(result).toBe('Policy document deleted');
    });

    it('throws a 404 when the document does not exist', async () => {
      organizationPolicyRepository.findByCode.mockResolvedValue(null);

      await expect(service.deletePolicy(ORG_ID, 'missing')).rejects.toThrow(
        AppException,
      );
      expect(organizationPolicyRepository.deleteWhere).not.toHaveBeenCalled();
      expect(fileUploadService.deleteAsset).not.toHaveBeenCalled();
    });
  });

  describe('getNotifications', () => {
    it('returns the stored notification preferences', async () => {
      const stored = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        promotionsAndOffers: true,
      };
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        notifications: stored,
      });

      const result = await service.getNotifications(ORG_ID);

      expect(result).toEqual(stored);
    });

    it('falls back to the default preferences when none are stored', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        notifications: null,
      });

      const result = await service.getNotifications(ORG_ID);

      expect(result).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(service.getNotifications(ORG_ID)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('updateNotifications', () => {
    it('merges a partial payload over the current preferences', async () => {
      const merged = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        promotionsAndOffers: true,
      };
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES },
      });
      organizationRepository.updateById.mockResolvedValue({
        _id: ORG_ID,
        notifications: merged,
      });

      const result = await service.updateNotifications(ORG_ID, {
        promotionsAndOffers: true,
      });

      expect(organizationRepository.updateById).toHaveBeenCalledWith(ORG_ID, {
        notifications: merged,
      });
      expect(result).toEqual(merged);
    });

    it('merges over the defaults when none are stored', async () => {
      const merged = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        smsNotifications: true,
      };
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        notifications: null,
      });
      organizationRepository.updateById.mockResolvedValue({
        _id: ORG_ID,
        notifications: merged,
      });

      const result = await service.updateNotifications(ORG_ID, {
        smsNotifications: true,
      });

      expect(organizationRepository.updateById).toHaveBeenCalledWith(ORG_ID, {
        notifications: merged,
      });
      expect(result).toEqual(merged);
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.updateNotifications(ORG_ID, { newsAndUpdates: false }),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('getEmployeeProfileSettings', () => {
    it('returns the stored employee profile settings', async () => {
      const stored = {
        ...DEFAULT_EMPLOYEE_PROFILE_SETTINGS,
        useEmployeeIdGenerator: false,
      };
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        employeeProfiles: stored,
      });

      const result = await service.getEmployeeProfileSettings(ORG_ID);

      expect(result).toEqual(stored);
    });

    it('falls back to the default settings when none are stored', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        employeeProfiles: null,
      });

      const result = await service.getEmployeeProfileSettings(ORG_ID);

      expect(result).toEqual(DEFAULT_EMPLOYEE_PROFILE_SETTINGS);
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(service.getEmployeeProfileSettings(ORG_ID)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('updateEmployeeProfileSettings', () => {
    it('merges a partial payload and replaces arrays', async () => {
      const merged = {
        ...DEFAULT_EMPLOYEE_PROFILE_SETTINGS,
        useEmployeeIdGenerator: false,
        documentFormats: ['pdf', 'docx'],
      };
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        employeeProfiles: { ...DEFAULT_EMPLOYEE_PROFILE_SETTINGS },
      });
      organizationRepository.updateById.mockResolvedValue({
        _id: ORG_ID,
        employeeProfiles: merged,
      });

      const result = await service.updateEmployeeProfileSettings(ORG_ID, {
        useEmployeeIdGenerator: false,
        documentFormats: ['pdf', 'docx'],
      } as any);

      expect(organizationRepository.updateById).toHaveBeenCalledWith(ORG_ID, {
        employeeProfiles: merged,
      });
      expect(result).toEqual(merged);
    });

    it('merges over the defaults when none are stored', async () => {
      const merged = {
        ...DEFAULT_EMPLOYEE_PROFILE_SETTINGS,
        employmentTypes: ['intern'],
      };
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        employeeProfiles: null,
      });
      organizationRepository.updateById.mockResolvedValue({
        _id: ORG_ID,
        employeeProfiles: merged,
      });

      const result = await service.updateEmployeeProfileSettings(ORG_ID, {
        employmentTypes: ['intern'],
      } as any);

      expect(organizationRepository.updateById).toHaveBeenCalledWith(ORG_ID, {
        employeeProfiles: merged,
      });
      expect(result).toEqual(merged);
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.updateEmployeeProfileSettings(ORG_ID, {
          useEmployeeIdGenerator: false,
        } as any),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  const buildStoredStep = (overrides: Record<string, any> = {}) => ({
    _id: new Types.ObjectId(),
    stepName: 'Kickoff',
    responsibleParty: 'Admin',
    taskType: null,
    dueDate: null,
    instructions: null,
    attachmentUrls: [],
    completionRequirements: [],
    ...overrides,
  });

  describe('getEmployeeWorkflow', () => {
    it('returns stored steps mapped with an id instead of _id', async () => {
      const step = buildStoredStep();
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        employeeWorkflow: {
          onboarding: [step],
          leave: [],
          offboarding: [],
        },
      });

      const result = await service.getEmployeeWorkflow(ORG_ID);

      expect(result.onboarding).toHaveLength(1);
      expect(result.onboarding[0]).toEqual({
        id: String(step._id),
        stepName: 'Kickoff',
        responsibleParty: 'Admin',
        taskType: null,
        dueDate: null,
        instructions: null,
        attachmentUrls: [],
        completionRequirements: [],
      });
      expect((result.onboarding[0] as any)._id).toBeUndefined();
    });

    it('falls back to the default workflow steps when none are stored', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        employeeWorkflow: null,
      });

      const result = await service.getEmployeeWorkflow(ORG_ID);

      expect(result.onboarding).toHaveLength(
        DEFAULT_EMPLOYEE_WORKFLOW_SETTINGS.onboarding.length,
      );
      expect(result.onboarding[0]).toMatchObject({
        stepName: DEFAULT_EMPLOYEE_WORKFLOW_SETTINGS.onboarding[0].stepName,
      });
      expect(typeof result.onboarding[0].id).toBe('string');
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(service.getEmployeeWorkflow(ORG_ID)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('addWorkflowStep', () => {
    it('appends a step to the requested workflow and persists it', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        employeeWorkflow: { onboarding: [], leave: [], offboarding: [] },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addWorkflowStep(ORG_ID, {
        type: 'onboarding',
        stepName: 'Sign employee agreement',
        responsibleParty: 'New hire',
      } as any);

      const saved =
        organizationRepository.updateById.mock.calls[0][1].employeeWorkflow;
      expect(saved.onboarding).toHaveLength(1);
      expect(saved.onboarding[0].stepName).toBe('Sign employee agreement');
      expect(result).toMatchObject({
        stepName: 'Sign employee agreement',
        responsibleParty: 'New hire',
      });
      expect(typeof result.id).toBe('string');
    });

    it('does not mutate the shared default constant', async () => {
      const initialLength =
        DEFAULT_EMPLOYEE_WORKFLOW_SETTINGS.onboarding.length;
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        employeeWorkflow: null,
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      await service.addWorkflowStep(ORG_ID, {
        type: 'onboarding',
        stepName: 'Sign employee agreement',
      } as any);

      expect(DEFAULT_EMPLOYEE_WORKFLOW_SETTINGS.onboarding).toHaveLength(
        initialLength,
      );
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.addWorkflowStep(ORG_ID, {
          type: 'onboarding',
          stepName: 'Sign employee agreement',
        } as any),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('updateWorkflowStep', () => {
    it('updates the fields of an existing step', async () => {
      const step = buildStoredStep({ stepName: 'Old name' });
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        employeeWorkflow: { onboarding: [step], leave: [], offboarding: [] },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.updateWorkflowStep(
        ORG_ID,
        String(step._id),
        {
          stepName: 'New name',
          dueDate: DueDate.TWO_DAYS_AFTER_JOINING,
        } as any,
      );

      const saved =
        organizationRepository.updateById.mock.calls[0][1].employeeWorkflow;
      expect(saved.onboarding[0].stepName).toBe('New name');
      expect(saved.onboarding[0].dueDate).toBe(DueDate.TWO_DAYS_AFTER_JOINING);
      expect(result).toMatchObject({
        id: String(step._id),
        stepName: 'New name',
        dueDate: DueDate.TWO_DAYS_AFTER_JOINING,
      });
    });

    it('finds and updates a step in any workflow type', async () => {
      const step = buildStoredStep({ stepName: 'Leave review' });
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        employeeWorkflow: { onboarding: [], leave: [step], offboarding: [] },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.updateWorkflowStep(
        ORG_ID,
        String(step._id),
        { stepName: 'Updated leave review' } as any,
      );

      expect(result).toMatchObject({ stepName: 'Updated leave review' });
    });

    it('throws a 404 when the step does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        employeeWorkflow: { onboarding: [], leave: [], offboarding: [] },
      });

      await expect(
        service.updateWorkflowStep(ORG_ID, 'missing', {
          stepName: 'New name',
        } as any),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.updateWorkflowStep(ORG_ID, 'missing', {
          stepName: 'New name',
        } as any),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('deleteWorkflowStep', () => {
    it('removes the step from its workflow', async () => {
      const step = buildStoredStep();
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        employeeWorkflow: { onboarding: [step], leave: [], offboarding: [] },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.deleteWorkflowStep(ORG_ID, String(step._id));

      const saved =
        organizationRepository.updateById.mock.calls[0][1].employeeWorkflow;
      expect(saved.onboarding).toHaveLength(0);
      expect(result).toEqual({ id: String(step._id) });
    });

    it('throws a 404 when the step does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        employeeWorkflow: { onboarding: [], leave: [], offboarding: [] },
      });

      await expect(
        service.deleteWorkflowStep(ORG_ID, 'missing'),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.deleteWorkflowStep(ORG_ID, 'missing'),
      ).rejects.toThrow(AppException);
    });
  });

  describe('getResponsibleParties', () => {
    it('returns the default parties plus stored custom parties', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        customResponsibleParties: ['Payroll'],
      });

      const result = await service.getResponsibleParties(ORG_ID);

      expect(result.defaultParties).toEqual(Object.values(ResponsibleParty));
      expect(result.customParties).toEqual(['Payroll']);
    });

    it('defaults custom parties to an empty list when none are stored', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      const result = await service.getResponsibleParties(ORG_ID);

      expect(result.customParties).toEqual([]);
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(service.getResponsibleParties(ORG_ID)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('addResponsibleParty', () => {
    it('appends a custom party and persists it', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        customResponsibleParties: ['Payroll'],
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addResponsibleParty(ORG_ID, {
        name: 'Recruiter',
      } as any);

      const saved =
        organizationRepository.updateById.mock.calls[0][1]
          .customResponsibleParties;
      expect(saved).toEqual(['Payroll', 'Recruiter']);
      expect(result.customParties).toEqual(['Payroll', 'Recruiter']);
      expect(result.defaultParties).toEqual(Object.values(ResponsibleParty));
    });

    it('trims the party name before saving', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        customResponsibleParties: [],
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addResponsibleParty(ORG_ID, {
        name: '  Recruiter  ',
      } as any);

      expect(result.customParties).toEqual(['Recruiter']);
    });

    it('rejects a party that duplicates a default option', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        customResponsibleParties: [],
      });

      await expect(
        service.addResponsibleParty(ORG_ID, { name: 'Admin' } as any),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });

    it('rejects a party that already exists in the custom list', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        customResponsibleParties: ['Payroll'],
      });

      await expect(
        service.addResponsibleParty(ORG_ID, { name: 'payroll' } as any),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.addResponsibleParty(ORG_ID, { name: 'Recruiter' } as any),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('getPensionFundAdministrators', () => {
    it('returns stored administrators mapped with an id instead of _id', async () => {
      const administratorId = new Types.ObjectId();
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        pensionFundAdministrators: [
          { _id: administratorId, name: 'Access Pensions Limited' },
        ],
      });

      const result = await service.getPensionFundAdministrators(ORG_ID);

      expect(result.administrators).toEqual([
        { id: String(administratorId), name: 'Access Pensions Limited' },
      ]);
      expect((result.administrators[0] as any)._id).toBeUndefined();
    });

    it('returns an empty list when none are stored', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      const result = await service.getPensionFundAdministrators(ORG_ID);

      expect(result.administrators).toEqual([]);
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.getPensionFundAdministrators(ORG_ID),
      ).rejects.toThrow(AppException);
    });
  });

  describe('addPensionFundAdministrator', () => {
    it('appends an administrator and persists it', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        pensionFundAdministrators: [],
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addPensionFundAdministrator(ORG_ID, {
        name: 'Access Pensions Limited',
      } as any);

      const saved =
        organizationRepository.updateById.mock.calls[0][1]
          .pensionFundAdministrators;
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe('Access Pensions Limited');
      expect(result).toEqual({
        id: String(saved[0]._id),
        name: 'Access Pensions Limited',
      });
    });

    it('trims the administrator name before saving', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        pensionFundAdministrators: [],
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addPensionFundAdministrator(ORG_ID, {
        name: '  Access Pensions Limited  ',
      } as any);

      expect(result.name).toBe('Access Pensions Limited');
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.addPensionFundAdministrator(ORG_ID, {
          name: 'Access Pensions Limited',
        } as any),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('getOnboardingSettings', () => {
    it('returns empty categories and disabled toggles when nothing is stored', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      const result = await service.getOnboardingSettings(ORG_ID);

      expect(result).toEqual({
        welcomeMessage: { enabled: false, message: null },
        defaultOnboardingDuration: { enabled: false, value: null },
        personalIdentificationDocuments: [],
        educationalProfessionalCerts: [],
        medicalHealthRecords: [],
        employerIssuedDocuments: [],
      });
    });

    it('returns stored settings mapped to the response shape', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        onboarding: {
          welcomeMessageEnabled: true,
          welcomeMessage: 'Welcome aboard',
          defaultDurationEnabled: true,
          defaultDuration: '2 weeks',
          personalIdentificationDocuments: [
            {
              id: 'national_id_card',
              label: 'National ID Card',
              selected: true,
              optional: false,
            },
          ],
          educationalProfessionalCerts: [],
          medicalHealthRecords: [],
          employerIssuedDocuments: [
            {
              id: 'offer_letter',
              name: 'Offer letter',
              fileType: 'pdf',
              requiresSignature: true,
            },
          ],
        },
      });

      const result = await service.getOnboardingSettings(ORG_ID);

      expect(result.welcomeMessage).toEqual({
        enabled: true,
        message: 'Welcome aboard',
      });
      expect(result.defaultOnboardingDuration).toEqual({
        enabled: true,
        value: '2 weeks',
      });
      expect(result.personalIdentificationDocuments).toEqual([
        {
          id: 'national_id_card',
          label: 'National ID Card',
          selected: true,
          optional: false,
        },
      ]);
      expect(result.employerIssuedDocuments).toEqual([
        {
          id: 'offer_letter',
          name: 'Offer letter',
          fileType: 'pdf',
          requiresSignature: true,
        },
      ]);
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(service.getOnboardingSettings(ORG_ID)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('updateOnboardingSettings', () => {
    it('merges the provided fields and persists them', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.updateOnboardingSettings(ORG_ID, {
        welcomeMessageEnabled: true,
        welcomeMessage: 'Hello there',
      } as any);

      const saved =
        organizationRepository.updateById.mock.calls[0][1].onboarding;
      expect(saved.welcomeMessageEnabled).toBe(true);
      expect(saved.welcomeMessage).toBe('Hello there');
      expect(saved.defaultDurationEnabled).toBe(false);
      expect(result.welcomeMessage).toEqual({
        enabled: true,
        message: 'Hello there',
      });
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.updateOnboardingSettings(ORG_ID, {
          welcomeMessageEnabled: true,
        } as any),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('addOnboardingDocument', () => {
    it('appends a document with a slug id and defaults selected to true', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addOnboardingDocument(ORG_ID, {
        category: 'personalIdentificationDocuments',
        label: 'National ID Card',
      } as any);

      const saved =
        organizationRepository.updateById.mock.calls[0][1].onboarding
          .personalIdentificationDocuments;
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({
        id: 'national_id_card',
        label: 'National ID Card',
        selected: true,
        optional: false,
      });
      expect(result).toEqual({
        id: 'national_id_card',
        label: 'National ID Card',
        selected: true,
        optional: false,
      });
    });

    it('deduplicates the slug when a document id already exists', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        onboarding: {
          personalIdentificationDocuments: [
            {
              id: 'national_id_card',
              label: 'National ID Card',
              selected: true,
              optional: false,
            },
          ],
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addOnboardingDocument(ORG_ID, {
        category: 'personalIdentificationDocuments',
        label: 'National ID Card',
      } as any);

      expect(result.id).toBe('national_id_card_2');
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.addOnboardingDocument(ORG_ID, {
          category: 'personalIdentificationDocuments',
          label: 'National ID Card',
        } as any),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('updateOnboardingDocument', () => {
    it('updates the matching document', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        onboarding: {
          medicalHealthRecords: [
            {
              id: 'pre_employment_medical_report',
              label: 'Pre-Employment Medical Report',
              selected: true,
              optional: false,
            },
          ],
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.updateOnboardingDocument(
        ORG_ID,
        'pre_employment_medical_report',
        { selected: false, optional: true } as any,
      );

      expect(result).toEqual({
        id: 'pre_employment_medical_report',
        label: 'Pre-Employment Medical Report',
        selected: false,
        optional: true,
      });
    });

    it('throws a 404 when the document is missing', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      await expect(
        service.updateOnboardingDocument(ORG_ID, 'missing', {
          selected: false,
        } as any),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('deleteOnboardingDocument', () => {
    it('removes the matching document', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        onboarding: {
          educationalProfessionalCerts: [
            {
              id: 'degree_certificates',
              label: 'Degree Certificates',
              selected: true,
              optional: false,
            },
          ],
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.deleteOnboardingDocument(
        ORG_ID,
        'degree_certificates',
      );

      const saved =
        organizationRepository.updateById.mock.calls[0][1].onboarding
          .educationalProfessionalCerts;
      expect(saved).toEqual([]);
      expect(result).toBe('Deleted onboarding document');
    });

    it('throws a 404 when the document is missing', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      await expect(
        service.deleteOnboardingDocument(ORG_ID, 'missing'),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('addEmployerIssuedDocument', () => {
    it('appends an employer-issued document with a slug id', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addEmployerIssuedDocument(ORG_ID, {
        name: 'Offer letter',
      } as any);

      const saved =
        organizationRepository.updateById.mock.calls[0][1].onboarding
          .employerIssuedDocuments;
      expect(saved).toHaveLength(1);
      expect(result).toEqual({
        id: 'offer_letter',
        name: 'Offer letter',
        fileType: null,
        requiresSignature: false,
      });
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.addEmployerIssuedDocument(ORG_ID, {
          name: 'Offer letter',
        } as any),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('updateEmployerIssuedDocument', () => {
    it('updates the matching document', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        onboarding: {
          employerIssuedDocuments: [
            {
              id: 'offer_letter',
              name: 'Offer letter',
              fileType: null,
              requiresSignature: false,
            },
          ],
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.updateEmployerIssuedDocument(
        ORG_ID,
        'offer_letter',
        { requiresSignature: true } as any,
      );

      expect(result).toEqual({
        id: 'offer_letter',
        name: 'Offer letter',
        fileType: null,
        requiresSignature: true,
      });
    });

    it('throws a 404 when the document is missing', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      await expect(
        service.updateEmployerIssuedDocument(ORG_ID, 'missing', {
          requiresSignature: true,
        } as any),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('deleteEmployerIssuedDocument', () => {
    it('removes the matching document', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        onboarding: {
          employerIssuedDocuments: [
            {
              id: 'offer_letter',
              name: 'Offer letter',
              fileType: null,
              requiresSignature: false,
            },
          ],
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.deleteEmployerIssuedDocument(
        ORG_ID,
        'offer_letter',
      );

      const saved =
        organizationRepository.updateById.mock.calls[0][1].onboarding
          .employerIssuedDocuments;
      expect(saved).toEqual([]);
      expect(result).toBe('Deleted employer-issued document');
    });

    it('throws a 404 when the document is missing', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      await expect(
        service.deleteEmployerIssuedDocument(ORG_ID, 'missing'),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('getRequestWorkflows', () => {
    it('returns every request type with empty workflow lists when nothing is stored', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      const result = await service.getRequestWorkflows(ORG_ID);

      expect(result.requestTypes).toHaveLength(10);
      expect(result.requestTypes[0]).toEqual({
        type: RequestType.EMPLOYEE_TERMINATION,
        label: 'Employee termination',
        workflows: [],
      });
    });

    it('groups stored workflows under their request type', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        requestWorkflows: [
          {
            _id: 'wf-1',
            requestType: RequestType.EMPLOYEE_TERMINATION,
            name: 'Employee termination workflow',
            isDefault: true,
            steps: [{ _id: 's-1', order: 1, responsibleParty: 'Admin' }],
          },
        ],
      });

      const result = await service.getRequestWorkflows(ORG_ID);

      const termination = result.requestTypes.find(
        (entry) => entry.type === RequestType.EMPLOYEE_TERMINATION,
      );
      expect(termination?.workflows).toHaveLength(1);
      expect(termination?.workflows[0]).toEqual({
        id: 'wf-1',
        requestType: RequestType.EMPLOYEE_TERMINATION,
        name: 'Employee termination workflow',
        isDefault: true,
        steps: [{ id: 's-1', order: 1, responsibleParty: 'Admin' }],
      });
    });

    it('narrows the response to a single request type when filtered', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      const result = await service.getRequestWorkflows(
        ORG_ID,
        RequestType.QUERY_REQUEST,
      );

      expect(result.requestTypes).toEqual([
        {
          type: RequestType.QUERY_REQUEST,
          label: 'Query request',
          workflows: [],
        },
      ]);
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(service.getRequestWorkflows(ORG_ID)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('getRequestWorkflow', () => {
    it('returns the matching workflow', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        requestWorkflows: [
          {
            _id: 'wf-1',
            requestType: RequestType.EMPLOYEE_TERMINATION,
            name: 'Termination workflow',
            isDefault: false,
            steps: [],
          },
        ],
      });

      const result = await service.getRequestWorkflow(ORG_ID, 'wf-1');

      expect(result).toEqual({
        id: 'wf-1',
        requestType: RequestType.EMPLOYEE_TERMINATION,
        name: 'Termination workflow',
        isDefault: false,
        steps: [],
      });
    });

    it('throws a 404 when the workflow is missing', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      await expect(
        service.getRequestWorkflow(ORG_ID, 'missing'),
      ).rejects.toThrow(AppException);
    });
  });

  describe('addRequestWorkflow', () => {
    it('appends a workflow with a default name and ordered steps', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addRequestWorkflow(ORG_ID, {
        requestType: RequestType.EMPLOYEE_TERMINATION,
        steps: [
          { responsibleParty: 'Admin' },
          { responsibleParty: 'Line manager' },
        ],
      } as any);

      const saved =
        organizationRepository.updateById.mock.calls[0][1].requestWorkflows;
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({
        requestType: RequestType.EMPLOYEE_TERMINATION,
        name: 'Employee termination workflow',
        isDefault: false,
      });
      expect(saved[0].steps).toHaveLength(2);
      expect(saved[0].steps[0]).toMatchObject({
        order: 1,
        responsibleParty: 'Admin',
      });
      expect(saved[0].steps[1]).toMatchObject({
        order: 2,
        responsibleParty: 'Line manager',
      });
      expect(result.name).toBe('Employee termination workflow');
    });

    it('honours an explicit workflow name', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addRequestWorkflow(ORG_ID, {
        requestType: RequestType.QUERY_REQUEST,
        name: 'Custom query flow',
      } as any);

      expect(result.name).toBe('Custom query flow');
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.addRequestWorkflow(ORG_ID, {
          requestType: RequestType.QUERY_REQUEST,
        } as any),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('updateRequestWorkflow', () => {
    it('replaces steps and updates the name', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        requestWorkflows: [
          {
            _id: 'wf-1',
            requestType: RequestType.EMPLOYEE_TERMINATION,
            name: 'Old name',
            isDefault: false,
            steps: [{ _id: 's-1', order: 1, responsibleParty: 'Admin' }],
          },
        ],
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.updateRequestWorkflow(ORG_ID, 'wf-1', {
        name: 'New name',
        steps: [{ responsibleParty: 'Finance' }],
      } as any);

      expect(result.name).toBe('New name');
      expect(result.steps).toEqual([
        expect.objectContaining({ order: 1, responsibleParty: 'Finance' }),
      ]);
    });

    it('clears the default flag on sibling workflows of the same request type', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        requestWorkflows: [
          {
            _id: 'wf-1',
            requestType: RequestType.EMPLOYEE_TERMINATION,
            name: 'First',
            isDefault: true,
            steps: [],
          },
          {
            _id: 'wf-2',
            requestType: RequestType.EMPLOYEE_TERMINATION,
            name: 'Second',
            isDefault: false,
            steps: [],
          },
        ],
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      await service.updateRequestWorkflow(ORG_ID, 'wf-2', {
        isDefault: true,
      } as any);

      const saved =
        organizationRepository.updateById.mock.calls[0][1].requestWorkflows;
      expect(saved.find((w: any) => w._id === 'wf-1').isDefault).toBe(false);
      expect(saved.find((w: any) => w._id === 'wf-2').isDefault).toBe(true);
    });

    it('throws a 404 when the workflow is missing', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      await expect(
        service.updateRequestWorkflow(ORG_ID, 'missing', { name: 'x' } as any),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('deleteRequestWorkflow', () => {
    it('removes the matching workflow', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        requestWorkflows: [
          {
            _id: 'wf-1',
            requestType: RequestType.EMPLOYEE_TERMINATION,
            name: 'Termination',
            isDefault: false,
            steps: [],
          },
        ],
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.deleteRequestWorkflow(ORG_ID, 'wf-1');

      const saved =
        organizationRepository.updateById.mock.calls[0][1].requestWorkflows;
      expect(saved).toEqual([]);
      expect(result).toBe('Request workflow deleted');
    });

    it('throws a 404 when the workflow is missing', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      await expect(
        service.deleteRequestWorkflow(ORG_ID, 'missing'),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('getLeaveManagementSettings', () => {
    it('returns the defaults when no settings are stored', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      const result = await service.getLeaveManagementSettings(ORG_ID);

      expect(result).toEqual(DEFAULT_LEAVE_MANAGEMENT_SETTINGS);
    });

    it('returns the stored settings', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        leaveManagement: {
          leaveCategories: [
            { id: 'annual_leave', label: 'Annual leave' },
            { id: 'sick_leave', label: 'Sick leave' },
          ],
          allowCarryover: true,
          autoApprovalEnabled: true,
          approvalDeadline: ApprovalDeadline.THREE_DAYS_AFTER_REQUESTED,
          holidaysCountAsLeave: true,
        },
      });

      const result = await service.getLeaveManagementSettings(ORG_ID);

      expect(result).toEqual({
        leaveCategories: [
          { id: 'annual_leave', label: 'Annual leave' },
          { id: 'sick_leave', label: 'Sick leave' },
        ],
        allowCarryover: true,
        autoApprovalEnabled: true,
        approvalDeadline: ApprovalDeadline.THREE_DAYS_AFTER_REQUESTED,
        holidaysCountAsLeave: true,
      });
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(service.getLeaveManagementSettings(ORG_ID)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('updateLeaveManagementSettings', () => {
    it('applies only the provided fields', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        leaveManagement: {
          leaveCategories: [{ id: 'annual_leave', label: 'Annual leave' }],
          allowCarryover: false,
          autoApprovalEnabled: false,
          approvalDeadline: null,
          holidaysCountAsLeave: false,
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.updateLeaveManagementSettings(ORG_ID, {
        allowCarryover: true,
        approvalDeadline: ApprovalDeadline.ONE_DAY_AFTER_REQUESTED,
      } as any);

      expect(result.allowCarryover).toBe(true);
      expect(result.approvalDeadline).toBe(
        ApprovalDeadline.ONE_DAY_AFTER_REQUESTED,
      );
      expect(result.leaveCategories).toEqual([
        { id: 'annual_leave', label: 'Annual leave' },
      ]);
      expect(result.autoApprovalEnabled).toBe(false);
      expect(result.holidaysCountAsLeave).toBe(false);
    });

    it('clears the approval deadline when null is provided', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        leaveManagement: {
          leaveCategories: [],
          allowCarryover: false,
          autoApprovalEnabled: false,
          approvalDeadline: ApprovalDeadline.TWO_DAYS_AFTER_REQUESTED,
          holidaysCountAsLeave: false,
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.updateLeaveManagementSettings(ORG_ID, {
        approvalDeadline: null,
      } as any);

      expect(result.approvalDeadline).toBeNull();
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.updateLeaveManagementSettings(ORG_ID, {
          allowCarryover: true,
        } as any),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('addLeaveCategory', () => {
    it('appends a new category with a slug id', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addLeaveCategory(ORG_ID, {
        label: 'Annual leave',
      } as any);

      expect(result.leaveCategories).toEqual([
        { id: 'annual_leave', label: 'Annual leave' },
      ]);
    });

    it('ignores a duplicate category regardless of case', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        leaveManagement: {
          leaveCategories: [{ id: 'annual_leave', label: 'Annual leave' }],
          allowCarryover: false,
          autoApprovalEnabled: false,
          approvalDeadline: null,
          holidaysCountAsLeave: false,
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addLeaveCategory(ORG_ID, {
        label: 'annual leave',
      } as any);

      expect(result.leaveCategories).toEqual([
        { id: 'annual_leave', label: 'Annual leave' },
      ]);
    });

    it('trims the category label', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addLeaveCategory(ORG_ID, {
        label: '  Sick leave  ',
      } as any);

      expect(result.leaveCategories).toEqual([
        { id: 'sick_leave', label: 'Sick leave' },
      ]);
    });

    it('suffixes the id when the slug already exists', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        leaveManagement: {
          leaveCategories: [{ id: 'annual_leave', label: 'Annual leave' }],
          allowCarryover: false,
          autoApprovalEnabled: false,
          approvalDeadline: null,
          holidaysCountAsLeave: false,
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addLeaveCategory(ORG_ID, {
        label: 'Annual-Leave',
      } as any);

      expect(result.leaveCategories).toEqual([
        { id: 'annual_leave', label: 'Annual leave' },
        { id: 'annual_leave_2', label: 'Annual-Leave' },
      ]);
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.addLeaveCategory(ORG_ID, { label: 'Annual leave' } as any),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('removeLeaveCategory', () => {
    it('removes a category by id', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        leaveManagement: {
          leaveCategories: [
            { id: 'annual_leave', label: 'Annual leave' },
            { id: 'sick_leave', label: 'Sick leave' },
          ],
          allowCarryover: false,
          autoApprovalEnabled: false,
          approvalDeadline: null,
          holidaysCountAsLeave: false,
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.removeLeaveCategory(ORG_ID, 'sick_leave');

      expect(result.leaveCategories).toEqual([
        { id: 'annual_leave', label: 'Annual leave' },
      ]);
    });

    it('throws a 404 when the category is missing', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      await expect(
        service.removeLeaveCategory(ORG_ID, 'missing'),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('getLeaveEntitlementSettings', () => {
    it('returns the defaults when no settings are stored', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      const result = await service.getLeaveEntitlementSettings(ORG_ID);

      expect(result).toEqual({
        ...DEFAULT_LEAVE_ENTITLEMENT_SETTINGS,
        allocationMethodLabel: null,
      });
    });

    it('returns the stored settings with the allocation method label', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        leaveEntitlement: {
          allocationMethod: LeaveAllocationMethod.FIXED_DAYS,
          employmentTypes: [EmploymentType.FULL_TIME, EmploymentType.INTERN],
          restrictedPeriods: [
            {
              id: 'financial_year_end',
              name: 'Financial Year-End',
              startDate: '2026-01-24',
              endDate: '2026-01-30',
              departmentCodes: ['fin', 'hr'],
            },
          ],
        },
      });

      const result = await service.getLeaveEntitlementSettings(ORG_ID);

      expect(result).toEqual({
        allocationMethod: LeaveAllocationMethod.FIXED_DAYS,
        allocationMethodLabel: 'Fixed days',
        employmentTypes: [EmploymentType.FULL_TIME, EmploymentType.INTERN],
        restrictedPeriods: [
          {
            id: 'financial_year_end',
            name: 'Financial Year-End',
            startDate: '2026-01-24',
            endDate: '2026-01-30',
            departmentCodes: ['fin', 'hr'],
          },
        ],
      });
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(service.getLeaveEntitlementSettings(ORG_ID)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('updateLeaveEntitlementSettings', () => {
    it('applies only the provided fields and de-duplicates employment types', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        leaveEntitlement: {
          allocationMethod: null,
          employmentTypes: [],
          restrictedPeriods: [],
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.updateLeaveEntitlementSettings(ORG_ID, {
        allocationMethod: LeaveAllocationMethod.ACCRUAL,
        employmentTypes: [
          EmploymentType.FULL_TIME,
          EmploymentType.FULL_TIME,
          EmploymentType.CONTRACT,
        ],
      });

      expect(result.allocationMethod).toBe(LeaveAllocationMethod.ACCRUAL);
      expect(result.employmentTypes).toEqual([
        EmploymentType.FULL_TIME,
        EmploymentType.CONTRACT,
      ]);
    });

    it('can clear the allocation method', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        leaveEntitlement: {
          allocationMethod: LeaveAllocationMethod.PRORATED,
          employmentTypes: [],
          restrictedPeriods: [],
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.updateLeaveEntitlementSettings(ORG_ID, {
        allocationMethod: null,
      });

      expect(result.allocationMethod).toBeNull();
      expect(result.allocationMethodLabel).toBeNull();
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.updateLeaveEntitlementSettings(ORG_ID, {
          allocationMethod: LeaveAllocationMethod.FIXED_DAYS,
        }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('addLeaveRestrictedPeriod', () => {
    it('adds a period with a slug id and de-duplicated department codes', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addLeaveRestrictedPeriod(ORG_ID, {
        name: 'Financial Year-End',
        startDate: '2026-01-24',
        endDate: '2026-01-30',
        departmentCodes: ['fin', 'fin', 'hr'],
      });

      expect(result.restrictedPeriods).toEqual([
        {
          id: 'financial_year_end',
          name: 'Financial Year-End',
          startDate: '2026-01-24',
          endDate: '2026-01-30',
          departmentCodes: ['fin', 'hr'],
        },
      ]);
    });

    it('appends a suffix when the slug already exists', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        leaveEntitlement: {
          allocationMethod: null,
          employmentTypes: [],
          restrictedPeriods: [
            {
              id: 'peak_business_seasons',
              name: 'Peak Business Seasons',
              startDate: '2026-01-24',
              endDate: '2026-01-30',
              departmentCodes: [],
            },
          ],
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addLeaveRestrictedPeriod(ORG_ID, {
        name: 'Peak Business Seasons',
        startDate: '2026-02-01',
        endDate: '2026-02-05',
        departmentCodes: [],
      });

      expect(result.restrictedPeriods.map((period) => period.id)).toEqual([
        'peak_business_seasons',
        'peak_business_seasons_2',
      ]);
    });

    it('adds a period even when the end date precedes the start date', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addLeaveRestrictedPeriod(ORG_ID, {
        name: 'Reversed',
        startDate: '2026-01-30',
        endDate: '2026-01-24',
        departmentCodes: [],
      });

      expect(result.restrictedPeriods).toEqual([
        {
          id: 'reversed',
          name: 'Reversed',
          startDate: '2026-01-30',
          endDate: '2026-01-24',
          departmentCodes: [],
        },
      ]);
      expect(organizationRepository.updateById).toHaveBeenCalled();
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.addLeaveRestrictedPeriod(ORG_ID, {
          name: 'Financial Year-End',
          startDate: '2026-01-24',
          endDate: '2026-01-30',
        }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('updateLeaveRestrictedPeriod', () => {
    it('applies only the provided fields', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        leaveEntitlement: {
          allocationMethod: null,
          employmentTypes: [],
          restrictedPeriods: [
            {
              id: 'financial_year_end',
              name: 'Financial Year-End',
              startDate: '2026-01-24',
              endDate: '2026-01-30',
              departmentCodes: ['fin'],
            },
          ],
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.updateLeaveRestrictedPeriod(
        ORG_ID,
        'financial_year_end',
        { endDate: '2026-02-02', departmentCodes: ['hr', 'hr'] },
      );

      expect(result.restrictedPeriods).toEqual([
        {
          id: 'financial_year_end',
          name: 'Financial Year-End',
          startDate: '2026-01-24',
          endDate: '2026-02-02',
          departmentCodes: ['hr'],
        },
      ]);
    });

    it('rejects an end date before the stored start date', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        leaveEntitlement: {
          allocationMethod: null,
          employmentTypes: [],
          restrictedPeriods: [
            {
              id: 'financial_year_end',
              name: 'Financial Year-End',
              startDate: '2026-01-24',
              endDate: '2026-01-30',
              departmentCodes: [],
            },
          ],
        },
      });

      await expect(
        service.updateLeaveRestrictedPeriod(ORG_ID, 'financial_year_end', {
          endDate: '2026-01-01',
        }),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });

    it('throws a 404 when the period is missing', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      await expect(
        service.updateLeaveRestrictedPeriod(ORG_ID, 'missing', {
          name: 'Nope',
        }),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('removeLeaveRestrictedPeriod', () => {
    it('removes a period by id', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        leaveEntitlement: {
          allocationMethod: null,
          employmentTypes: [],
          restrictedPeriods: [
            {
              id: 'financial_year_end',
              name: 'Financial Year-End',
              startDate: '2026-01-24',
              endDate: '2026-01-30',
              departmentCodes: [],
            },
            {
              id: 'peak_business_seasons',
              name: 'Peak Business Seasons',
              startDate: '2026-01-24',
              endDate: '2026-01-30',
              departmentCodes: [],
            },
          ],
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.removeLeaveRestrictedPeriod(
        ORG_ID,
        'peak_business_seasons',
      );

      expect(result.restrictedPeriods).toEqual([
        {
          id: 'financial_year_end',
          name: 'Financial Year-End',
          startDate: '2026-01-24',
          endDate: '2026-01-30',
          departmentCodes: [],
        },
      ]);
    });

    it('throws a 404 when the period is missing', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      await expect(
        service.removeLeaveRestrictedPeriod(ORG_ID, 'missing'),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('getOffboardingSettings', () => {
    it('returns the defaults when no settings are stored', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      const result = await service.getOffboardingSettings(ORG_ID);

      expect(result).toEqual(DEFAULT_OFFBOARDING_SETTINGS);
    });

    it('returns the stored settings', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        offboarding: {
          offboardingTypes: [{ id: 'resignation', label: 'Resignation' }],
          exitReasons: [{ id: 'relocation', label: 'Relocation' }],
          exitChecklist: [
            {
              id: 'asset_return',
              label: 'Asset return',
              description: 'Return of laptop, ID badges, phone',
              selected: true,
            },
          ],
        },
      });

      const result = await service.getOffboardingSettings(ORG_ID);

      expect(result).toEqual({
        offboardingTypes: [{ id: 'resignation', label: 'Resignation' }],
        exitReasons: [{ id: 'relocation', label: 'Relocation' }],
        exitChecklist: [
          {
            id: 'asset_return',
            label: 'Asset return',
            description: 'Return of laptop, ID badges, phone',
            selected: true,
          },
        ],
      });
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(service.getOffboardingSettings(ORG_ID)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('addOffboardingType', () => {
    it('adds a type with a slug id', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addOffboardingType(ORG_ID, {
        label: 'End of contract',
      });

      expect(result.offboardingTypes).toEqual([
        { id: 'end_of_contract', label: 'End of contract' },
      ]);
    });

    it('ignores a duplicate label regardless of case', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        offboarding: {
          offboardingTypes: [{ id: 'resignation', label: 'Resignation' }],
          exitReasons: [],
          exitChecklist: [],
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addOffboardingType(ORG_ID, {
        label: 'resignation',
      });

      expect(result.offboardingTypes).toEqual([
        { id: 'resignation', label: 'Resignation' },
      ]);
    });

    it('appends a suffix when the slug already exists', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        offboarding: {
          offboardingTypes: [{ id: 'lay_off', label: 'Lay off' }],
          exitReasons: [],
          exitChecklist: [],
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addOffboardingType(ORG_ID, {
        label: 'Lay-off',
      });

      expect(result.offboardingTypes.map((type) => type.id)).toEqual([
        'lay_off',
        'lay_off_2',
      ]);
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.addOffboardingType(ORG_ID, { label: 'Resignation' }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('removeOffboardingType', () => {
    it('removes a type by id', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        offboarding: {
          offboardingTypes: [
            { id: 'resignation', label: 'Resignation' },
            { id: 'termination', label: 'Termination' },
          ],
          exitReasons: [],
          exitChecklist: [],
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.removeOffboardingType(ORG_ID, 'termination');

      expect(result.offboardingTypes).toEqual([
        { id: 'resignation', label: 'Resignation' },
      ]);
    });

    it('throws a 404 when the type is missing', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      await expect(
        service.removeOffboardingType(ORG_ID, 'missing'),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('addExitReason', () => {
    it('adds a reason with a slug id', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addExitReason(ORG_ID, {
        label: 'Work-Life balance',
      });

      expect(result.exitReasons).toEqual([
        { id: 'work_life_balance', label: 'Work-Life balance' },
      ]);
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.addExitReason(ORG_ID, { label: 'Relocation' }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('removeExitReason', () => {
    it('removes a reason by id', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        offboarding: {
          offboardingTypes: [],
          exitReasons: [
            { id: 'relocation', label: 'Relocation' },
            { id: 'retirement', label: 'Retirement' },
          ],
          exitChecklist: [],
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.removeExitReason(ORG_ID, 'retirement');

      expect(result.exitReasons).toEqual([
        { id: 'relocation', label: 'Relocation' },
      ]);
    });

    it('throws a 404 when the reason is missing', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      await expect(service.removeExitReason(ORG_ID, 'missing')).rejects.toThrow(
        AppException,
      );
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('addExitChecklistItem', () => {
    it('adds a selected item with a trimmed description', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addExitChecklistItem(ORG_ID, {
        label: 'Exit interview',
        description: '  Schedule interview  ',
      });

      expect(result.exitChecklist).toEqual([
        {
          id: 'exit_interview',
          label: 'Exit interview',
          description: 'Schedule interview',
          selected: true,
        },
      ]);
    });

    it('defaults the description to null when omitted', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.addExitChecklistItem(ORG_ID, {
        label: 'Asset return',
      });

      expect(result.exitChecklist).toEqual([
        {
          id: 'asset_return',
          label: 'Asset return',
          description: null,
          selected: true,
        },
      ]);
    });

    it('throws a 404 when the organization does not exist', async () => {
      organizationRepository.findOrg.mockResolvedValue(null);

      await expect(
        service.addExitChecklistItem(ORG_ID, { label: 'Asset return' }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('updateExitChecklistItem', () => {
    it('applies only the provided fields', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        offboarding: {
          offboardingTypes: [],
          exitReasons: [],
          exitChecklist: [
            {
              id: 'asset_return',
              label: 'Asset return',
              description: 'Return of laptop',
              selected: true,
            },
          ],
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.updateExitChecklistItem(
        ORG_ID,
        'asset_return',
        { selected: false },
      );

      expect(result.exitChecklist).toEqual([
        {
          id: 'asset_return',
          label: 'Asset return',
          description: 'Return of laptop',
          selected: false,
        },
      ]);
    });

    it('clears the description with an explicit null', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        offboarding: {
          offboardingTypes: [],
          exitReasons: [],
          exitChecklist: [
            {
              id: 'asset_return',
              label: 'Asset return',
              description: 'Return of laptop',
              selected: true,
            },
          ],
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.updateExitChecklistItem(
        ORG_ID,
        'asset_return',
        { description: null },
      );

      expect(result.exitChecklist[0].description).toBeNull();
    });

    it('throws a 404 when the item is missing', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      await expect(
        service.updateExitChecklistItem(ORG_ID, 'missing', {
          selected: false,
        }),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('removeExitChecklistItem', () => {
    it('removes an item by id', async () => {
      organizationRepository.findOrg.mockResolvedValue({
        _id: ORG_ID,
        offboarding: {
          offboardingTypes: [],
          exitReasons: [],
          exitChecklist: [
            {
              id: 'asset_return',
              label: 'Asset return',
              description: null,
              selected: true,
            },
            {
              id: 'knowledge_transfer',
              label: 'Knowledge transfer',
              description: null,
              selected: true,
            },
          ],
        },
      });
      organizationRepository.updateById.mockResolvedValue({ _id: ORG_ID });

      const result = await service.removeExitChecklistItem(
        ORG_ID,
        'knowledge_transfer',
      );

      expect(result.exitChecklist).toEqual([
        {
          id: 'asset_return',
          label: 'Asset return',
          description: null,
          selected: true,
        },
      ]);
    });

    it('throws a 404 when the item is missing', async () => {
      organizationRepository.findOrg.mockResolvedValue({ _id: ORG_ID });

      await expect(
        service.removeExitChecklistItem(ORG_ID, 'missing'),
      ).rejects.toThrow(AppException);
      expect(organizationRepository.updateById).not.toHaveBeenCalled();
    });
  });
});
