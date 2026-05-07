jest.mock('@aws-sdk/client-s3', () => {
  const send = jest.fn();
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send })),
    PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
    DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
    GetObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'generated-key'),
}));

jest.mock('src/config/config.service', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    S3_REGION: 'ap-south-1',
    S3_BUCKET_NAME: 'bucket-name',
    S3_ACCESS_KEY: 'access-key',
    S3_SECRET_ACCESS_KEY: 'secret-key',
  })),
}));

import { InternalServerErrorException } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    service = new StorageService();
  });

  it('builds a public file url', () => {
    expect(service.getFileUrl('file-key')).toBe(
      'https://bucket-name.s3.amazonaws.com/file-key',
    );
  });

  it('returns an empty list when no files are provided', async () => {
    await expect(service.uploadMultipleFiles([] as any)).resolves.toEqual([]);
  });

  it('uploads a single file and returns a presigned url', async () => {
    const sendMock = (service as any).client.send as jest.Mock;
    sendMock.mockResolvedValue({ ETag: 'etag' });
    jest
      .spyOn(service, 'getPresignedSignedUrl')
      .mockResolvedValue('https://signed-url');

    const result = await service.uploadSingleFile({
      buffer: Buffer.from('data'),
      mimetype: 'image/png',
      originalname: 'image.png',
    } as any);

    expect(sendMock).toHaveBeenCalled();
    expect(result).toEqual({
      url: 'https://signed-url',
      key: 'generated-key',
      uploadResult: { ETag: 'etag' },
    });
  });

  it('wraps presigned url generation errors', async () => {
    (getSignedUrl as jest.Mock).mockRejectedValue(new Error('boom'));

    await expect(service.getPresignedSignedUrl('file-key')).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('uploads multiple files', async () => {
    const uploadSpy = jest
      .spyOn(service, 'uploadSingleFile')
      .mockResolvedValue({
        key: 'generated-key',
        url: 'https://signed-url',
        uploadResult: {
          $metadata: {},
        },
      });

    const result = await service.uploadMultipleFiles([
      { originalname: 'a.png' },
      { originalname: 'b.png' },
    ] as any);

    expect(uploadSpy).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  it('wraps uploadSingleFile errors', async () => {
    const sendMock = (service as any).client.send as jest.Mock;
    sendMock.mockRejectedValue(new Error('upload failed'));

    await expect(
      service.uploadSingleFile({
        buffer: Buffer.from('data'),
        mimetype: 'image/png',
        originalname: 'image.png',
      } as any),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('deletes a file successfully', async () => {
    const sendMock = (service as any).client.send as jest.Mock;
    sendMock.mockResolvedValue({});

    await expect(service.deleteFile('file-key')).resolves.toEqual({
      message: 'File deleted successfully',
    });

    expect(sendMock).toHaveBeenCalled();
  });

  it('wraps deleteFile errors', async () => {
    const sendMock = (service as any).client.send as jest.Mock;
    sendMock.mockRejectedValue(new Error('delete failed'));

    await expect(service.deleteFile('file-key')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
