import {
  Controller,
  HttpCode,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from './file-upload.service';
import { AppResponse } from '../common';
import { Public } from '../common/decorators/public.decorator';

@Controller('upload')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Public()
  @Post('/files')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  async uploadFiles(
    @Query('flag') flag: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.fileUploadService.uploadFile(file, flag);

    return AppResponse.success('Successfully uploaded file', 200, data);
  }
}
