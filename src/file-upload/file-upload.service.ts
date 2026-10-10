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
  [FileExtensionType.DOCUMENTS]: [
    'pdf',
    'doc',
    'docx',
    'txt',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
  ],
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

  /**
   * @Responsibility: Delete a previously uploaded asset from Cloudinary.
   * Best-effort — failures are logged and never thrown so callers can safely
   * remove their own records without being blocked by a storage hiccup.
   *
   * @param {string} publicId the Cloudinary public id returned on upload
   * @param {string} flag one of FileExtensionType (images | csv | xlsx | pdf | documents)
   * @returns {Promise<void>}
   */
  async deleteAsset(publicId: string | null, flag: string): Promise<void> {
    if (!publicId) return;

    const resourceType = flag === FileExtensionType.IMAGES ? 'image' : 'raw';

    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true,
      });
    } catch (error) {
      this.logger.error(
        `Failed to delete asset '${publicId}' from Cloudinary`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * @Responsibility: Recover the Cloudinary public id from a previously
   * returned secure URL. Policy documents only receive the file URL from the
   * client, so the public id required for later deletion is derived here.
   *
   * For `raw` assets the public id keeps its file extension, matching what
   * `uploader.destroy` expects. Returns null when the URL is not a Cloudinary
   * delivery URL (the caller then skips remote deletion).
   *
   * @param {string} url the Cloudinary secure_url returned on upload
   * @returns {string | null}
   */
  derivePublicId(url: string): string | null {
    if (!url) return null;

    const marker = '/upload/';
    const index = url.indexOf(marker);
    if (index === -1) return null;

    const path = url
      .slice(index + marker.length)
      .split('?')[0]
      .split('#')[0]
      .replace(/^v\d+\//, '');

    if (!path) return null;

    try {
      return decodeURIComponent(path);
    } catch {
      return path;
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
