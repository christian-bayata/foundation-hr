import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import { extname } from 'path';
import { AppResponse } from '../common';
import { FileExtensionType } from './enum/file-upload.enum';

const ALLOWED_EXTENSIONS: Record<FileExtensionType, string[]> = {
  [FileExtensionType.IMAGES]: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  [FileExtensionType.CSV]: ['csv'],
  [FileExtensionType.XLSX]: ['xlsx'],
  [FileExtensionType.PDF]: ['pdf'],
};

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private readonly folder: string;

  constructor(private readonly configService: ConfigService) {
    const cloudinaryUrl =
      this.configService.getOrThrow<string>('CLOUDINARY_URL');
    const { hostname, username, password } = new URL(cloudinaryUrl);

    cloudinary.config({
      cloud_name: hostname,
      api_key: decodeURIComponent(username),
      api_secret: decodeURIComponent(password),
    });

    this.folder = this.configService.getOrThrow<string>('CLOUDINARY_FOLDER');
  }

  /**
   * @Responsibility: upload a file to Cloudinary and return its public URL
   *
   * @param {Express.Multer.File} file
   * @param {string} flag one of FileExtensionType (images | csv | xlsx | pdf)
   * @returns {Promise<{ url: string; publicId: string; format: string; size: number }>}
   *
   * @throws {400} No file uploaded / invalid flag / unsupported file type
   * @throws {500} Upload to Cloudinary failed
   */
  async uploadFile(file: Express.Multer.File, flag: string) {
    if (!file) {
      AppResponse.error({
        message: 'No file uploaded',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const allowedExtensions = ALLOWED_EXTENSIONS[flag as FileExtensionType];
    if (!allowedExtensions) {
      AppResponse.error({
        message: `Invalid upload flag. Allowed values: ${Object.values(FileExtensionType).join(', ')}`,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const extension = extname(file.originalname).slice(1).toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      AppResponse.error({
        message: `Unsupported file type. Allowed extensions for '${flag}': ${allowedExtensions.join(', ')}`,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const resourceType = flag === FileExtensionType.IMAGES ? 'image' : 'raw';
    const folder = `${this.folder}/${flag}`;

    try {
      const result = await this.uploadToCloudinary(file, folder, resourceType);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        size: result.bytes,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload file '${file.originalname}' to Cloudinary`,
        error instanceof Error ? error.stack : String(error),
      );

      AppResponse.error({
        message: 'Failed to upload file',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  private uploadToCloudinary(
    file: Express.Multer.File,
    folder: string,
    resourceType: 'image' | 'raw',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary returned no result'));
            return;
          }

          resolve(result);
        },
      );

      uploadStream.end(file.buffer);
    });
  }
}
