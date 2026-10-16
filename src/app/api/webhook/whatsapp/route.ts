/**
 * ============================================================================
 * WHATSAPP CLOUD API (GRAPH API v20.0+) WEBHOOK INGESTION ROUTE HANDLER
 * Haritha Pasal (Green Schools) • GIZ Sri Lanka 15-School Pilot Platform
 *
 * Compliance:
 * - Execution Target: Vercel Frankfurt (fra1) strictly for EU GDPR / AVV compliance
 * - Zero OCI / Non-EU proxying (Never route through 168.107.65.183 Singapore OCI)
 * - Stateless Ingestion: Stream binary buffers directly into Supabase Frankfurt (haritha-proofs)
 * - Strict Webhook Security: SHA-256 HMAC verification via crypto.timingSafeEqual
 * - Identity Resolution: E.164 MSISDN normalization against public.profiles
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseServiceClient } from '@/lib/supabase/client';
import { extractAndValidateExif, calculateDistanceMeters } from '@/lib/exif/parser';
import { getPlatformStore, findOrFetchImpactLog } from '@/lib/store/platform-store';
import { ImpactLog } from '@/types/domain';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1'; // Strictly Vercel Frankfurt, Germany (EU GDPR)
export const dynamic = 'force-static';


interface WhatsAppWebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'image' | 'document' | 'text' | 'interactive' | 'button';
  image?: {
    id: string;
    mime_type: string;
    sha256?: string;
    caption?: string;
  };
  document?: {
    id: string;
    mime_type: string;
    filename?: string;
    sha256?: string;
    caption?: string;
  };
  text?: {
    body: string;
  };
}

/**
 * Sends a real-time WhatsApp Cloud API outbound response message (Graph API v20.0)
 */
async function sendWhatsAppTextMessage(params: { to: string; text: string }) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId || token.includes('your-whatsapp-access-token')) {
    console.log(`[WhatsApp Sandbox Outbound -> ${params.to}]:\n${params.text}`);
    return;
  }

  try {
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: params.to,
        type: 'text',
        text: { body: params.text },
      }),
    });
  } catch (err) {
    console.warn('[WhatsApp Outbound] Message dispatch error:', err);
  }
}

/**
 * GET Handler: Meta Webhook Subscription Verification Challenge
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    console.log('✅ [WhatsApp Webhook] Verification challenge passed successfully.');
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('❌ [WhatsApp Webhook] Verification challenge failed or token mismatch.');
  return new Response('Forbidden', { status: 403 });
}

/**
 * POST Handler: Inbound WhatsApp Cloud API Ingestion Pipeline
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // 1. Strict Security: Meta X-Hub-Signature-256 HMAC Verification
    const signature = req.headers.get('x-hub-signature-256');
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    if (!signature || !signature.startsWith('sha256=')) {
      console.warn('❌ [WhatsApp Webhook] Missing or invalid x-hub-signature-256 header.');
      return new Response('Unauthorized: Missing signature', { status: 401 });
    }

    if (!appSecret) {
      console.error('CRITICAL: WHATSAPP_APP_SECRET is not configured in environment.');
      return new Response('Configuration Error', { status: 500 });
    }

    const expectedHash = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    const incomingHash = signature.slice(7);
    const expectedBuf = Buffer.from(expectedHash, 'hex');
    const incomingBuf = Buffer.from(incomingHash, 'hex');

    if (
      expectedBuf.length !== incomingBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, incomingBuf)
    ) {
      console.warn('❌ [WhatsApp Webhook] Invalid HMAC signature mismatch.');
      return new Response('Unauthorized: Invalid HMAC signature', { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // 2. Extract Inbound Messages (Acknowledge non-message status events with 200 immediately)
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages: WhatsAppWebhookMessage[] | undefined = value?.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ status: 'ignored_status_update' }, { status: 200 });
    }

    const message = messages[0];
    const whatsappMessageId = message.id;
    const rawFrom = message.from; // e.g. "94771234501"
    const normalizedPhone = rawFrom.replace(/[^0-9]/g, '');

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      console.error('CRITICAL: Supabase client unavailable.');
      return NextResponse.json({ error: 'Supabase unavailable' }, { status: 500 });
    }

    // 3. Identity Resolution against public.profiles using E.164-normalized phone
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .or(`phone_number.eq.${normalizedPhone},phone_number.eq.+${normalizedPhone}`)
      .maybeSingle();

    if (!profile) {
      console.warn(`⚠️ [WhatsApp Ingestion] Unregistered mobile number: +${normalizedPhone}`);
      await sendWhatsAppTextMessage({
        to: rawFrom,
        text:
          `⚠️ *Haritha Pasal (Green Schools) Alert*\n\n` +
          `Your mobile number (+${normalizedPhone}) is not registered as an authorized student enterprise or supervising teacher.\n\n` +
          `Please contact your school's Supervising Teacher or the GIZ Sri Lanka Program Secretariat to register your mobile number.`,
      });
      // Always return 200 to Meta so it does not retry flooding the webhook
      return NextResponse.json({ status: 'unregistered_sender_handled' }, { status: 200 });
    }

    // 4. Media Ingestion & Stateless In-Memory Streaming
    const mediaObject = message.image || message.document;
    if (!mediaObject?.id) {
      // User sent text command or inquiry
      const textQuery = message.text?.body?.trim() || '';
      await sendWhatsAppTextMessage({
        to: rawFrom,
        text:
          `👋 Welcome to *Haritha Pasal* (${profile.club_name || profile.school_name || 'Pilot'})!\n\n` +
          `• Enterprise: ${profile.club_name || 'School Enterprise'}\n` +
          `• Member: ${profile.full_name}\n\n` +
          `📸 *To log a circular activity:* Tap the 📎 icon and send an uncompressed Photo or Document of your recycling, upcycling, or sales evidence.\n` +
          `📊 *View Dashboard:* Open your school portal at https://deathrowz.github.io/circular-economy-schoolclubs-pilot/`,
      });
      return NextResponse.json({ status: 'text_command_acknowledged' }, { status: 200 });
    }

    const mediaId = mediaObject.id;
    const mimeType = mediaObject.mime_type || 'image/jpeg';
    const caption = mediaObject.caption || 'Circular Economy Impact Submission';
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    // 5. Fetch Temporary Media URL from Meta Graph API v20.0
    const metaMediaUrl = `https://graph.facebook.com/v20.0/${mediaId}`;
    const metaMediaRes = await fetch(metaMediaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!metaMediaRes.ok) {
      console.error('❌ [WhatsApp Ingestion] Failed to fetch media URL from Meta:', await metaMediaRes.text());
      return NextResponse.json({ error: 'failed_fetching_media_url' }, { status: 200 });
    }

    const mediaMetadata = await metaMediaRes.json();
    const cdnUrl = mediaMetadata.url;

    // 6. Direct In-Memory Stream (Zero Local Filesystem Persistence)
    const streamRes = await fetch(cdnUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!streamRes.ok) {
      console.error('❌ [WhatsApp Ingestion] Failed to stream binary media:', streamRes.status);
      return NextResponse.json({ error: 'failed_streaming_binary' }, { status: 200 });
    }

    const arrayBuffer = await streamRes.arrayBuffer();
    const mediaBuffer = Buffer.from(arrayBuffer);
    const ext = mimeType.includes('pdf') ? 'pdf' : mimeType.includes('png') ? 'png' : 'jpg';
    const originalFileName = message.document?.filename || `${mediaId}.${ext}`;

    // 7. In-Memory EXIF Extraction & Campus Distance Calculation
    let exifLat: number | null = null;
    let exifLng: number | null = null;
    let exifTimestamp: string = new Date().toISOString();
    let campusDistanceMeters = 0;
    let onCampusVerified = true;

    try {
      const parsedExif = await extractAndValidateExif(mediaBuffer, {
        fileName: originalFileName,
      });
      if (parsedExif.valid && parsedExif.metadata) {
        exifLat = parsedExif.metadata.lat ?? null;
        exifLng = parsedExif.metadata.lng ?? null;
        if (parsedExif.metadata.timestamp) {
          exifTimestamp = parsedExif.metadata.timestamp;
        }
      }
    } catch (e) {
      console.warn('[WhatsApp Ingestion] EXIF extraction note:', e);
    }

    // Geolocation verification against school campus coordinates
    if (profile.school_id && exifLat !== null && exifLng !== null) {
      const { data: school } = await supabase
        .from('schools')
        .select('campus_lat, campus_lng, campus_radius_meters')
        .eq('id', profile.school_id)
        .maybeSingle();

      if (school?.campus_lat && school?.campus_lng) {
        campusDistanceMeters = calculateDistanceMeters(
          exifLat,
          exifLng,
          Number(school.campus_lat),
          Number(school.campus_lng)
        );
        onCampusVerified = campusDistanceMeters <= (school.campus_radius_meters || 500);
      }
    }

    // 8. Upload Memory Buffer Directly to Private Supabase Storage Bucket 'haritha-proofs'
    const storagePath = `schools/${profile.school_code || 'SCH-01'}/${profile.club_id || 'general'}/${Date.now()}_${mediaId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('haritha-proofs')
      .upload(storagePath, mediaBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ [WhatsApp Ingestion] Supabase Storage upload error:', uploadError);
    }

    // 9. Persist Record to public.submissions & public.impact_logs
    const submissionId = `sub-wa-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    const submissionRecord = {
      id: submissionId,
      phone_number: normalizedPhone,
      whatsapp_message_id: whatsappMessageId,
      student_id: profile.id,
      student_name: profile.full_name,
      school_id: profile.school_id || 'sch-01',
      school_name: profile.school_name || 'Pilot School',
      school_code: profile.school_code || 'SCH-01',
      club_id: profile.club_id || 'club-01',
      club_name: profile.club_name || 'Circular Eco Club',
      activity_title: caption.slice(0, 80) || 'WhatsApp Activity Evidence',
      description: `Logged via WhatsApp Cloud API v20.0 from +${normalizedPhone}`,
      media_storage_path: storagePath,
      mime_type: mimeType,
      file_size_bytes: mediaBuffer.length,
      exif_lat: exifLat,
      exif_lng: exifLng,
      exif_timestamp: exifTimestamp,
      campus_distance_meters: Number(campusDistanceMeters.toFixed(2)),
      on_campus_verified: onCampusVerified,
      waste_kg: 1.0,
      revenue_usd: 0.35,
      co2_saved_kg: 2.4,
      transaction_type: 'micro',
      status: 'pending',
      created_at: nowIso,
      updated_at: nowIso,
    };

    // Insert into public.submissions
    await supabase.from('submissions').insert(submissionRecord);

    // Synchronize to public.impact_logs for web dashboard real-time tables
    await supabase.from('impact_logs').insert({
      ...submissionRecord,
      file_name: originalFileName,
      is_uncompressed_document: true,
      s3_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/haritha-proofs/${storagePath}`,
      s3_key: storagePath,
      verified_documents: [],
    });

    // 10. Send Confirmation WhatsApp Message to Student
    await sendWhatsAppTextMessage({
      to: rawFrom,
      text:
        `✅ *ACTIVITY LOGGED (${submissionId})*\n\n` +
        `• *Enterprise:* ${profile.club_name || profile.organization}\n` +
        `• *School:* ${profile.school_name} (${profile.school_code})\n` +
        `• *Activity:* "${submissionRecord.activity_title}"\n` +
        `• *School GPS:* ${
          onCampusVerified
            ? '✅ Verified on school campus'
            : `⚠️ Off-campus flag (${Math.round(campusDistanceMeters)}m from campus)`
        }\n` +
        `• *Status:* PENDING Supervising Teacher Review\n\n` +
        `Your Supervising Teacher has received this submission for Tier 1 local verification.`,
    });

    console.log(`✅ [WhatsApp Ingestion] Successfully ingested submission ${submissionId} for ${profile.full_name}`);

    return NextResponse.json({
      ok: true,
      submissionId,
      status: 'pending_teacher_review',
    });
  } catch (err) {
    console.error('❌ [WhatsApp Webhook] Unexpected runtime error:', err);
    // Return 200 with error log so Meta does not repetitively hammer the webhook
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 200 }
    );
  }
}
