import { RequestType } from '../../../generic/setting/request-management/enum/request-management.enum';

export type RequestFormFieldType = 'text' | 'textarea' | 'select' | 'date';

export type RequestFormDirection = 'outgoing' | 'incoming' | 'self_service';

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

export interface RequestFormAttachmentDefinition {
  key: string;
  label: string;
  required: boolean;
}

export interface RequestFormDefinition {
  requestType: RequestType;
  label: string;
  employeeContext: string[];
  fields: RequestFormFieldDefinition[];
  extendedFields?: RequestFormFieldDefinition[];
  category?: string;
  restricted?: boolean;
  direction?: RequestFormDirection;
  approvalChainPreview?: string[];
  attachments?: RequestFormAttachmentDefinition[];
  primaryActionLabel?: string;
}

export type RequestFormDtoClass = new () => object;
