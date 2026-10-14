import { ConfigService } from '@nestjs/config';
import { FileUploadService } from './file-upload.service';

describe('FileUploadService', () => {
  let service: FileUploadService;

  beforeEach(() => {
    const configService = {
      getOrThrow: jest
        .fn()
        .mockReturnValue('cloudinary://key:secret@foundationhr'),
    } as unknown as ConfigService;

    service = new FileUploadService(configService);
  });

  describe('derivePublicId', () => {
    it('derives the raw public id (with extension) from a Cloudinary url', () => {
      expect(
        service.derivePublicId(
          'https://res.cloudinary.com/demo/raw/upload/v1700000000/foundationhr/documents/hr-handbook.pdf',
        ),
      ).toBe('foundationhr/documents/hr-handbook.pdf');
    });

    it('derives the public id when there is no version segment', () => {
      expect(
        service.derivePublicId(
          'https://res.cloudinary.com/demo/image/upload/foundationhr/logos/logo.png',
        ),
      ).toBe('foundationhr/logos/logo.png');
    });

    it('url-decodes the derived public id', () => {
      expect(
        service.derivePublicId(
          'https://res.cloudinary.com/demo/raw/upload/v1/foundationhr/documents/hr%20handbook.pdf',
        ),
      ).toBe('foundationhr/documents/hr handbook.pdf');
    });

    it('ignores query strings and fragments', () => {
      expect(
        service.derivePublicId(
          'https://res.cloudinary.com/demo/raw/upload/v1/foundationhr/documents/hr.pdf?foo=bar#frag',
        ),
      ).toBe('foundationhr/documents/hr.pdf');
    });

    it('returns null when the url is not a Cloudinary delivery url', () => {
      expect(
        service.derivePublicId('https://cdn.example.com/hr-handbook.pdf'),
      ).toBeNull();
    });

    it('returns null for empty or missing urls', () => {
      expect(service.derivePublicId('')).toBeNull();
      expect(service.derivePublicId(undefined as unknown as string)).toBeNull();
    });
  });

  describe('ensureExtension', () => {
    const ensure = (value: string, format: string) =>
      (service as unknown as {
        ensureExtension: (v: string, f: string) => string;
      }).ensureExtension(value, format);

    it('appends the extension when the url has none', () => {
      expect(
        ensure(
          'https://res.cloudinary.com/bayata/raw/upload/v1791986460/foundation_hr_files/pdf/file_b7i987',
          'pdf',
        ),
      ).toBe(
        'https://res.cloudinary.com/bayata/raw/upload/v1791986460/foundation_hr_files/pdf/file_b7i987.pdf',
      );
    });

    it('keeps a url that already ends with the extension', () => {
      expect(
        ensure(
          'https://res.cloudinary.com/bayata/raw/upload/v1/foundation_hr_files/pdf/file_b7i987.pdf',
          'pdf',
        ),
      ).toBe(
        'https://res.cloudinary.com/bayata/raw/upload/v1/foundation_hr_files/pdf/file_b7i987.pdf',
      );
    });

    it('preserves query strings and fragments when appending', () => {
      expect(ensure('https://cdn.example.com/report?dl=1', 'pdf')).toBe(
        'https://cdn.example.com/report.pdf?dl=1',
      );
    });
  });
});
