import {
  findOrFetchImpactLog,
  getPlatformStore,
  performTeacherReview,
} from '@/lib/store/platform-store';
import { handleTelegramBotUpdate } from '@/lib/telegram/bot-handler';

async function testSupabaseLogLookupAndReview() {
  console.log('🧪 Testing findOrFetchImpactLog with real Supabase log "log-51343"...');

  // Ensure store does not have log-51343 initially
  const store = getPlatformStore();
  const initialIndex = store.impactLogs.findIndex((l) => l.id === 'log-51343');
  if (initialIndex !== -1) {
    store.impactLogs.splice(initialIndex, 1);
  }

  // 1. Verify findOrFetchImpactLog fetches log-51343 from Supabase
  const log = await findOrFetchImpactLog('log-51343');
  if (!log) {
    throw new Error('FAILED: findOrFetchImpactLog could not retrieve log-51343 from Supabase!');
  }

  console.log(`✅ [1/3] Successfully retrieved "${log.id}" from Supabase!`);
  console.log(`   Activity: "${log.activity_title}" | School: ${log.school_name} (${log.school_code}) | Status: ${log.status}`);

  if (log.id !== 'log-51343') {
    throw new Error(`Expected log-51343, got ${log.id}`);
  }

  // 2. Test Telegram Bot /review log-51343 lookup
  const botReviewRes = await handleTelegramBotUpdate({
    chatId: 999001,
    actorRole: 'expert_admin',
    actorId: 'usr-expert-01',
    text: '/review log-51343',
  });

  if (!botReviewRes.ok || !botReviewRes.botReply.includes('EXPERT DOSSIER REVIEW (log-51343)')) {
    throw new Error(`FAILED: Telegram Bot /review log-51343 failed! Reply: ${botReviewRes.botReply}`);
  }
  console.log('✅ [2/3] Telegram Bot successfully retrieved and formatted /review log-51343!');

  // 3. Test Teacher Review (Royal College Teacher usr-teacher-01)
  console.log('🧪 Testing performTeacherReview by usr-teacher-01 on log-51343...');
  // Check if log is pending or flagged so it can be reviewed
  if (log.status === 'pending' || log.status === 'flagged') {
    const reviewResult = await performTeacherReview({
      actorId: 'usr-teacher-01', // Royal College Teacher
      logId: 'log-51343',
      decision: 'approve',
      notesOrReason: 'Verified solar and e-waste collection activity on Royal premises.',
    });

    console.log(`✅ [3/3] Teacher successfully approved log-51343! New status: ${reviewResult.log.status}, Points awarded: +${reviewResult.log.points_awarded}`);
  } else {
    console.log(`ℹ️ [3/3] log-51343 status is already "${log.status}" (previously transitioned).`);
  }

  console.log('\n🎉 ALL SUPABASE LOG LOOKUP & ACTION TESTS PASSED PERFECTLY!\n');
}

testSupabaseLogLookupAndReview().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
