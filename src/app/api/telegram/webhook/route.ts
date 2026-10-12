import { NextRequest, NextResponse } from 'next/server';
import {
  handleTelegramBotUpdate,
  IncomingTelegramUpdate,
} from '@/lib/telegram/bot-handler';
import { getFullPlatformSnapshot } from '@/lib/store/platform-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support both raw Telegram Bot Webhook JSON (`body.message`) and Simulator JSON (`body.chatId`)
    let normalizedUpdate: IncomingTelegramUpdate;

    if (body.message || body.edited_message) {
      const msg = body.message || body.edited_message;
      const isCompressedPhoto = Array.isArray(msg.photo) && msg.photo.length > 0 && !msg.document;

      normalizedUpdate = {
        chatId: msg.chat?.id || 800101,
        text: msg.text || msg.caption,
        sentAsCompressedPhoto: isCompressedPhoto,
        document: msg.document
          ? {
              fileName: msg.document.file_name || 'telegram_document.jpg',
              mimeType: msg.document.mime_type || 'image/jpeg',
              simulatedExif: msg.document.simulatedExif,
            }
          : undefined,
      };
    } else {
      normalizedUpdate = body as IncomingTelegramUpdate;
    }

    const result = await handleTelegramBotUpdate(normalizedUpdate);

    return NextResponse.json({
      ...result,
      snapshot: getFullPlatformSnapshot(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Telegram webhook processing error',
      },
      { status: 400 }
    );
  }
}
