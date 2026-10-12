/**
 * Client 1: Standalone Node.js Telegram Bot Runner for Student Data Entry
 * Run via: `npm run bot` (with TELEGRAM_BOT_TOKEN set in .env)
 * Also integrated directly with Next.js Webhook at `/api/telegram/webhook`.
 */

import {
  handleTelegramBotUpdate,
  TelegramReplyMarkup,
} from '../src/lib/telegram/bot-handler';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const TELEGRAM_FILE_API = `https://api.telegram.org/file/bot${BOT_TOKEN}`;

async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  replyMarkup?: TelegramReplyMarkup
) {
  if (!BOT_TOKEN || BOT_TOKEN.includes('your-telegram-bot-token')) {
    console.log(`[Bot Reply -> Chat ${chatId}]:\n${text}\n`);
    if (replyMarkup) {
      console.log(`[Buttons / Keyboards]:`, JSON.stringify(replyMarkup, null, 2));
    }
    return;
  }
  const payload: Record<string, any> = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
  };
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function downloadTelegramDocumentBuffer(fileId: string): Promise<Buffer> {
  const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const data = (await res.json()) as { ok: boolean; result?: { file_path: string } };
  if (!data.ok || !data.result?.file_path) {
    throw new Error('Failed to resolve file_path from Telegram getFile API.');
  }
  const fileRes = await fetch(`${TELEGRAM_FILE_API}/${data.result.file_path}`);
  const arrayBuf = await fileRes.arrayBuffer();
  return Buffer.from(arrayBuf);
}

export async function processRawTelegramWebhookPayload(payload: Record<string, any>) {
  // 1. Handle Inline Button Clicks (callback_query)
  if (payload.callback_query) {
    const cq = payload.callback_query;
    const chatId = cq.message?.chat?.id || 800101;
    const text: string = cq.data || '';

    // Acknowledge Telegram callback query so loading spinner dismisses
    if (BOT_TOKEN && !BOT_TOKEN.includes('your-telegram-bot-token') && cq.id) {
      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: cq.id }),
      }).catch(() => {});
    }

    const result = await handleTelegramBotUpdate({
      chatId,
      text,
    });
    await sendTelegramMessage(chatId, result.botReply, result.replyMarkup);
    return result;
  }

  const message = payload.message || payload.edited_message;
  if (!message) return { ok: true, ignored: true };

  const chatId = message.chat?.id || 800101;
  const text: string | undefined = message.text || message.caption;

  // Enforce The Metadata Constraint:
  // If user sends standard `message.photo` (compressed by Telegram) instead of `message.document`
  if (Array.isArray(message.photo) && message.photo.length > 0 && !message.document) {
    const result = await handleTelegramBotUpdate({
      chatId,
      sentAsCompressedPhoto: true,
    });
    await sendTelegramMessage(chatId, result.botReply, result.replyMarkup);
    return result;
  }

  // If user sends an uncompressed `message.document`
  if (message.document) {
    const doc = message.document;
    let fileBufferBase64: string | undefined;

    if (BOT_TOKEN && !BOT_TOKEN.includes('your-telegram-bot-token') && doc.file_id) {
      const buf = await downloadTelegramDocumentBuffer(doc.file_id);
      fileBufferBase64 = buf.toString('base64');
    }

    const result = await handleTelegramBotUpdate({
      chatId,
      document: {
        fileName: doc.file_name || 'telegram_document.jpg',
        mimeType: doc.mime_type || 'image/jpeg',
        fileBufferBase64,
        simulatedExif: doc.simulatedExif,
      },
    });
    await sendTelegramMessage(chatId, result.botReply, result.replyMarkup);
    return result;
  }

  const result = await handleTelegramBotUpdate({
    chatId,
    text,
  });
  await sendTelegramMessage(chatId, result.botReply, result.replyMarkup);
  return result;
}

// CLI Polling Entrypoint when executed via `npm run bot`
if (require.main === module) {
  console.log('🤖 Circular-Economy Student Enterprise Telegram Bot initialized.');
  console.log('🔒 Metadata Constraint Active: Rejecting compressed photos; requiring uncompressed Documents with EXIF GPS & Timestamp.');
  if (!BOT_TOKEN || BOT_TOKEN.includes('your-telegram-bot-token')) {
    console.log(
      'ℹ️ TELEGRAM_BOT_TOKEN not set in environment. Running quick self-check simulation...'
    );
    (async () => {
      await handleTelegramBotUpdate({ chatId: 800101, text: '/start' }).then((r) =>
        console.log('\n[1] /start ->\n' + r.botReply)
      );
      await handleTelegramBotUpdate({ chatId: 800101, sentAsCompressedPhoto: true }).then((r) =>
        console.log('\n[2] Compressed Photo Sent ->\n' + r.botReply)
      );
    })();
  }
}
