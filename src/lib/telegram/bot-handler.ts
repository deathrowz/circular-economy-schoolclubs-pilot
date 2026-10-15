/**
 * @deprecated Telegram bot logic is deprecated in favor of Meta's WhatsApp Cloud API (Graph API v20.0+).
 * This module is maintained strictly as a backwards-compatible facade for existing tests and components.
 * Use `@/lib/whatsapp/handler` directly.
 */

export {
  type WhatsAppConversationStage as BotConversationStage,
  type WhatsAppBotSession as TelegramBotSession,
  getWhatsAppSession as getBotSession,
  type IncomingWhatsAppUpdate as IncomingTelegramUpdate,
  type WhatsAppQuickAction as BotQuickAction,
  STUDENT_TOUCH_KEYBOARD,
  TEACHER_TOUCH_KEYBOARD,
  EXPERT_TOUCH_KEYBOARD,
  type WhatsAppHandlerResponse as BotHandlerResponse,
  handleWhatsAppCloudUpdate as handleTelegramBotUpdate,
} from '@/lib/whatsapp/handler';
