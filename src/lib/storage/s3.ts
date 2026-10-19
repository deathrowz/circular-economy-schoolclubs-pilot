import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_ENDPOINT = process.env.S3_ENDPOINT || undefined;
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'circular-enterprise-evidence';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY_ID || '';
const S3_SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY || '';
const S3_PUBLIC_BASE =
  process.env.S3_PUBLIC_URL_BASE || `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`;

function isS3Configured(): boolean {
  return Boolean(
    S3_ACCESS_KEY &&
      S3_SECRET_KEY &&
      !S3_ACCESS_KEY.includes('your-s3-access-key')
  );
}

export function getS3Client(): S3Client {
  return new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    credentials: {
      accessKeyId: S3_ACCESS_KEY || 'demo-access-key',
      secretAccessKey: S3_SECRET_KEY || 'demo-secret-key',
    },
    forcePathStyle: Boolean(S3_ENDPOINT && !S3_ENDPOINT.includes('amazonaws.com')),
  });
}

export interface PresignedUploadResult {
  uploadUrl: string;
  publicUrl: string;
  s3Key: string;
  bucket: string;
  expiresInSeconds: number;
  mode: 'live_s3' | 'simulated_s3';
}

/**
 * Generates a presigned S3 PUT URL for uploading an uncompressed student impact document
 * while preserving original EXIF headers in S3 object metadata.
 */
export async function generatePresignedUploadUrl(params: {
  schoolCode: string;
  clubSlug: string;
  fileName: string;
  mimeType: string;
  exifTimestamp: string;
  exifLat: number;
  exifLng: number;
}): Promise<PresignedUploadResult> {
  const sanitizedName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const s3Key = `schools/${params.schoolCode}/${params.clubSlug}/${Date.now()}_${sanitizedName}`;
  const publicUrl = `${S3_PUBLIC_BASE}/${s3Key}`;

  if (isS3Configured()) {
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      ContentType: params.mimeType,
      Metadata: {
        'exif-timestamp': params.exifTimestamp,
        'exif-lat': String(params.exifLat),
        'exif-lng': String(params.exifLng),
        'uncompressed-document': 'true',
      },
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
    return {
      uploadUrl,
      publicUrl,
      s3Key,
      bucket: S3_BUCKET,
      expiresInSeconds: 900,
      mode: 'live_s3',
    };
  }

  // Fallback presigned URL structure when running without external AWS credentials
  return {
    uploadUrl: `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${s3Key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=900&X-Amz-SignedHeaders=host`,
    publicUrl,
    s3Key,
    bucket: S3_BUCKET,
    expiresInSeconds: 900,
    mode: 'simulated_s3',
  };
}

/**
 * Uploads an uncompressed document buffer directly to S3 from the WhatsApp Cloud webhook handler
 */
export async function uploadDocumentBufferToS3(params: {
  buffer: Uint8Array;
  schoolCode: string;
  clubSlug: string;
  fileName: string;
  mimeType: string;
  exifTimestamp: string;
  exifLat: number;
  exifLng: number;
}): Promise<{ s3Url: string; s3Key: string; mode: 'live_s3' | 'simulated_s3' }> {
  const sanitizedName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const s3Key = `schools/${params.schoolCode}/${params.clubSlug}/${Date.now()}_${sanitizedName}`;
  const publicUrl = `${S3_PUBLIC_BASE}/${s3Key}`;

  if (isS3Configured()) {
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: params.buffer,
        ContentType: params.mimeType,
        Metadata: {
          'exif-timestamp': params.exifTimestamp,
          'exif-lat': String(params.exifLat),
          'exif-lng': String(params.exifLng),
          'uncompressed-document': 'true',
        },
      })
    );

    return {
      s3Url: publicUrl,
      s3Key,
      mode: 'live_s3',
    };
  }

  return {
    s3Url: publicUrl,
    s3Key,
    mode: 'simulated_s3',
  };
}

/**
 * Generates a presigned GET URL to inspect an archived EXIF document from S3
 */
export async function getPresignedReadUrl(s3Key: string): Promise<string> {
  if (isS3Configured()) {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
    });
    return getSignedUrl(client, command, { expiresIn: 3600 });
  }
  return `${S3_PUBLIC_BASE}/${s3Key}`;
}
