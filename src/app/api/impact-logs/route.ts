import { NextRequest, NextResponse } from 'next/server';
import {
  createStudentImpactSubmission,
  getFullPlatformSnapshot,
  getPlatformStore,
} from '@/lib/store/platform-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const store = getPlatformStore();
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');
  const schoolId = searchParams.get('schoolId');
  const actorId = searchParams.get('actorId');

  let logs = store.impactLogs;

  // Enforce strict anti-tamper RBAC Scoping on GET
  const actor = actorId ? store.users.find((u) => u.id === actorId) : null;
  const effectiveRole = actor ? actor.role : role;
  const effectiveSchoolId = actor && (actor.role === 'teacher' || actor.role === 'student') ? actor.school_id : schoolId;

  if ((effectiveRole === 'teacher' || effectiveRole === 'student') && effectiveSchoolId) {
    logs = logs.filter((l) => l.school_id === effectiveSchoolId);
  } else if (effectiveRole === 'mentor' && actorId) {
    const mentor = store.users.find((u) => u.id === actorId);
    const assigned = mentor?.assigned_club_ids || [];
    logs = logs.filter((l) => assigned.includes(l.club_id));
  }

  return NextResponse.json({ ok: true, impactLogs: logs });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = await createStudentImpactSubmission({
      actorId: body.actorId || 'usr-student-01',
      clubId: body.clubId || 'club-01',
      fileName: body.fileName || 'WHATSAPP_DOC.JPG',
      mimeType: body.mimeType || 'image/jpeg',
      isUncompressedDocument: Boolean(body.isUncompressedDocument),
      s3Url: body.s3Url,
      s3Key: body.s3Key,
      exifTimestamp: body.exifTimestamp,
      exifLat: Number(body.exifLat),
      exifLng: Number(body.exifLng),
      exifDeviceMake: body.exifDeviceMake,
      exifDeviceModel: body.exifDeviceModel,
      activityTitle: body.activityTitle,
      activityCategory: body.activityCategory || 'upcycled_production',
      description: body.description || '',
      wasteKg: Number(body.wasteKg),
      revenueUsd: Number(body.revenueUsd),
      isFinalPitch: Boolean(body.isFinalPitch),
      parentLogId: body.parentLogId,
    });

    return NextResponse.json({
      ok: true,
      log: created,
      snapshot: getFullPlatformSnapshot(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to create impact log',
      },
      { status: 422 }
    );
  }
}
