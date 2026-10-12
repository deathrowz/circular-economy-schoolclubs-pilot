import { NextRequest, NextResponse } from 'next/server';
import { generatePresignedUploadUrl } from '@/lib/storage/s3';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      schoolCode,
      clubSlug,
      fileName,
      mimeType,
      exifTimestamp,
      exifLat,
      exifLng,
    } = body;

    if (!exifTimestamp || typeof exifLat !== 'number' || typeof exifLng !== 'number') {
      return NextResponse.json(
        {
          ok: false,
          error:
            'EXIF_MISSING: Cannot generate S3 presigned URL without verified EXIF timestamp and GPS coordinates.',
        },
        { status: 422 }
      );
    }

    const presigned = await generatePresignedUploadUrl({
      schoolCode: schoolCode || 'SCH-01',
      clubSlug: clubSlug || 'revolt-ewaste-labs',
      fileName: fileName || 'document.jpg',
      mimeType: mimeType || 'image/jpeg',
      exifTimestamp,
      exifLat,
      exifLng,
    });

    return NextResponse.json({
      ok: true,
      ...presigned,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to generate presigned S3 URL',
      },
      { status: 500 }
    );
  }
}
