import { IsEnum, IsOptional } from 'class-validator';
import { RequestType } from '../enum/request-management.enum';

export class RequestWorkflowQueryDto {
  @IsEnum(RequestType, { message: 'Request type is not valid.' })
  @IsOptional()
  requestType?: RequestType;
}
