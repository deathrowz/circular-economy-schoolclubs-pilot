import {
  getFullPlatformSnapshot,
  performExpertAdjudication,
  performTeacherReview,
  updateGamificationConfig,
} from '@/lib/store/platform-store';
import {
  handleTelegramBotUpdate,
  IncomingTelegramUpdate,
} from '@/lib/telegram/bot-handler';

/**
 * Isomorphic Platform Bridge:
 * - In full-stack server environments (Next.js dev/start, Vercel, Docker), calls `/api/platform` & `/api/telegram/webhook`.
 * - In static export environments (GitHub Pages `output: 'export'`), falls back seamlessly to the isomorphic in-browser platform engine.
 */
export async function fetchPlatformSnapshotClient() {
  try {
    const res = await fetch('/api/platform');
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      return await res.json();
    }
  } catch {
    // Static export mode (GitHub Pages) fallback
  }
  return getFullPlatformSnapshot();
}

export async function postPlatformActionClient(body: Record<string, any>): Promise<{
  resOk: boolean;
  data: any;
}> {
  try {
    const res = await fetch('/api/platform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      return { resOk: res.ok, data };
    }
  } catch {
    // Static export mode (GitHub Pages) fallback
  }

  try {
    const { actionType } = body;
    if (actionType === 'TEACHER_REVIEW') {
      const result = await performTeacherReview({
        actorId: body.actorId,
        logId: body.logId,
        decision: body.decision,
        notesOrReason: body.notesOrReason,
        forceRandomAuditSelection: body.forceRandomAuditSelection,
      });
      return {
        resOk: true,
        data: { ok: true, result, snapshot: getFullPlatformSnapshot() },
      };
    }

    if (actionType === 'EXPERT_ADJUDICATION') {
      const result = await performExpertAdjudication({
        actorId: body.actorId,
        logId: body.logId,
        action: body.action,
        criteriaScores: body.criteriaScores,
        notesOrReason: body.notesOrReason,
      });
      return {
        resOk: true,
        data: { ok: true, result, snapshot: getFullPlatformSnapshot() },
      };
    }

    if (actionType === 'UPDATE_GAMIFICATION_CONFIG') {
      const config = updateGamificationConfig({
        actorId: body.actorId,
        updates: body.updates,
      });
      return {
        resOk: true,
        data: { ok: true, config, snapshot: getFullPlatformSnapshot() },
      };
    }

    return {
      resOk: false,
      data: { ok: false, error: `Unknown actionType: ${actionType}` },
    };
  } catch (err) {
    return {
      resOk: false,
      data: {
        ok: false,
        error: err instanceof Error ? err.message : 'Operation failed',
      },
    };
  }
}

export async function postTelegramWebhookClient(body: Record<string, any>) {
  try {
    const res = await fetch('/api/telegram/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.headers.get('content-type')?.includes('application/json')) {
      return await res.json();
    }
  } catch {
    // Static export mode (GitHub Pages) fallback
  }

  try {
    const result = await handleTelegramBotUpdate(body as IncomingTelegramUpdate);
    return {
      ...result,
      snapshot: getFullPlatformSnapshot(),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Telegram webhook processing error',
    };
  }
}
