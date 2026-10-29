import { RequestType } from '../../setting/request-management/enum/request-management.enum';

export type RequestFormFieldType = 'text' | 'textarea' | 'select' | 'date';

export interface RequestFormSelectOption {
  value: string;
  label: string;
}

export interface RequestFormFieldDefinition {
  key: string;
  label: string;
  type: RequestFormFieldType;
  required: boolean;
  options?: RequestFormSelectOption[];
  placeholder?: string;
  maxLength?: number;
}

export interface RequestFormDefinition {
  requestType: RequestType;
  label: string;
  employeeContext: string[];
  fields: RequestFormFieldDefinition[];
}

export type RequestFormDtoClass = new () => object;
