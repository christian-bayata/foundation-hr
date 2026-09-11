import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AppResponse, JoiValidationPipe } from '../../common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { IRequest } from '../../common';
import { EmployeeService } from './employee.service';
import { StepOneDto } from './dto/step-one.dto';
import { StepTwoDto } from './dto/step-two.dto';
import { stepOneSchema } from './dto/step-one.schema';
import { stepTwoSchema } from './dto/step-two.schema';
import {
  employeeIdParamSchema,
  listEmployeeQuerySchema,
} from './dto/employee.schemas';
import type { ListEmployeeQuery } from './interface/employee.interface';

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post('/step-one')
  @UsePipes(new JoiValidationPipe(stepOneSchema))
  async createBasicInfo(
    @Req() req: IRequest,
    @Body() stepOneDto: StepOneDto,
  ) {
    stepOneDto.req = req;
    const data = await this.employeeService.createBasicInfo(stepOneDto);

    return AppResponse.success('Employee draft created successfully', 201, data);
  }

  @Post('/step-two/:employeeId')
  @HttpCode(HttpStatus.OK)
  async saveContractDetails(
    @Req() req: IRequest,
    @Param('employeeId', new JoiValidationPipe(employeeIdParamSchema))
    employeeId: string,
    @Body(new JoiValidationPipe(stepTwoSchema))
    stepTwoDto: StepTwoDto,
  ) {
    stepTwoDto.req = req;
    const data = await this.employeeService.saveContractDetails(
      employeeId,
      stepTwoDto,
    );

    return AppResponse.success('Contract details saved successfully', 200, data);
  }

  @Get('/retrieve/all')
  @UsePipes(new JoiValidationPipe(listEmployeeQuerySchema))
  async listEmployees(@Query() query: ListEmployeeQuery) {
    const data = await this.employeeService.listEmployees(query);

    return AppResponse.success('Employees retrieved successfully', 200, data);
  }

  @Get('/:employeeId')
  async getEmployee(
    @Param('employeeId', new JoiValidationPipe(employeeIdParamSchema))
    employeeId: string,
  ) {
    const data = await this.employeeService.getEmployee(employeeId);

    return AppResponse.success('Employee retrieved successfully', 200, data);
  }

  @Post('/:employeeId/save-draft')
  @HttpCode(HttpStatus.OK)
  async saveDraft(
    @Param('employeeId', new JoiValidationPipe(employeeIdParamSchema))
    employeeId: string,
  ) {
    const data = await this.employeeService.saveDraft(employeeId);

    return AppResponse.success('Employee draft saved successfully', 200, data);
  }

  @Post('/:employeeId/invite')
  @HttpCode(HttpStatus.OK)
  async inviteEmployee(
    @Param('employeeId', new JoiValidationPipe(employeeIdParamSchema))
    employeeId: string,
  ) {
    const data = await this.employeeService.inviteEmployee(employeeId);

    return AppResponse.success('Employee invited successfully', 200, data);
  }
}
