import assert from 'node:assert/strict';
import {
  createSampleExifDocumentBuffer,
  extractAndValidateExif,
} from '../exif/parser';
import { handleTelegramBotUpdate } from '../telegram/bot-handler';
import {
  getFullPlatformSnapshot,
  performExpertAdjudication,
  performTeacherReview,
} from '../store/platform-store';

async function runVerificationSuite() {
  console.log('🧪 Running Circular-Economy Student Enterprise Verification Suite...\n');

  // 1. Test Metadata Constraint: Reject compressed photo
  const compressedRes = await extractAndValidateExif(Buffer.from('fake'), {
    sentAsCompressedPhoto: true,
  });
  assert.equal(compressedRes.valid, false);
  assert.equal(compressedRes.errorCode, 'COMPRESSED_PHOTO_REJECTED');
  console.log('✅ [1/7] Metadata Constraint: Compressed Telegram photos rejected.');

  // 2. Test EXIF Validation: Reject missing GPS & accept valid Uncompressed Document
  const noGpsBuf = createSampleExifDocumentBuffer({
    timestamp: '2026-10-12T10:00:00Z',
    lat: null,
    lng: null,
  });
  const noGpsRes = await extractAndValidateExif(noGpsBuf);
  assert.equal(noGpsRes.valid, false);
  assert.equal(noGpsRes.errorCode, 'MISSING_EXIF_GPS');

  const validBuf = createSampleExifDocumentBuffer({
    timestamp: '2026-10-12T10:00:00Z',
    lat: 45.523062,
    lng: -122.676482,
  });
  const validExifRes = await extractAndValidateExif(validBuf);
  assert.equal(validExifRes.valid, true);
  assert.equal(validExifRes.metadata?.lat, 45.523062);
  console.log('✅ [2/7] EXIF Parser: Missing GPS rejected; valid uncompressed EXIF extracted.');

  // 3. Test Telegram Bot 6-Step Student Submission Workflow (Macro > $50)
  const chatId = 999001;
  await handleTelegramBotUpdate({
    chatId,
    studentId: 'usr-student-01',
    clubId: 'club-01',
    text: '/log_impact',
  });

  const stepDoc = await handleTelegramBotUpdate({
    chatId,
    document: {
      fileName: 'SOLAR_BATCH_EVIDENCE.JPG',
      mimeType: 'image/jpeg',
      simulatedExif: {
        timestamp: '2026-10-12T10:30:00Z',
        lat: 45.5231,
        lng: -122.6764,
      },
    },
  });
  assert.equal(stepDoc.ok, true);
  assert.equal(stepDoc.stage, 'AWAITING_ACTIVITY_TITLE');

  await handleTelegramBotUpdate({
    chatId,
    text: 'Refurbished Solar Lab Bench Power Supply Sale',
  });
  await handleTelegramBotUpdate({
    chatId,
    text: '16.5',
  });
  const finalStep = await handleTelegramBotUpdate({
    chatId,
    text: '125', // $125 > $50 threshold -> Macro-Transaction!
  });
  assert.equal(finalStep.ok, true);
  assert.ok(finalStep.createdLogId);
  console.log(
    `✅ [3/7] Telegram Bot Workflow: Created Macro-Transaction ${finalStep.createdLogId} (status: pending).`
  );

  // 4. Test RBAC School Isolation (Teacher from SCH-02 cannot approve SCH-01's log)
  let rbacBlocked = false;
  try {
    await performTeacherReview({
      actorId: 'usr-teacher-02', // Mr. Marcus Chen (SCH-02)
      logId: finalStep.createdLogId!, // Belongs to SCH-01
      decision: 'approve',
    });
  } catch (err) {
    rbacBlocked = (err as Error).message.includes('RBAC_SCHOOL_SCOPE_VIOLATION');
  }
  assert.equal(rbacBlocked, true);
  console.log('✅ [4/7] RBAC Enforcement: Cross-school Teacher review blocked by policy.');

  // 5. Test Step 2 & Step 3 Threshold Routing:
  // 5a. Teacher approves Macro-Transaction -> routes to `pending_expert_review` with 0 points
  const macroReview = await performTeacherReview({
    actorId: 'usr-teacher-01', // Ms. Elena Vance (SCH-01)
    logId: finalStep.createdLogId!,
    decision: 'approve',
    notesOrReason: 'Confirmed on campus in Lab 204',
  });
  assert.equal(macroReview.log.status, 'pending_expert_review');
  assert.equal(macroReview.log.points_awarded, 0);

  // 5b. Teacher approves Micro-Transaction (`log-101`, $38 <= $50) -> immediately awards points + 10% audit roll
  const microReview = await performTeacherReview({
    actorId: 'usr-teacher-01',
    logId: 'log-101',
    decision: 'approve',
    forceRandomAuditSelection: true,
  });
  assert.equal(microReview.log.status, 'approved');
  assert.ok(microReview.log.points_awarded > 0);
  assert.equal(microReview.log.random_audit_selected, true);
  assert.equal(microReview.log.audit_status, 'pending_audit');
  console.log(
    `✅ [5/7] Threshold Routing: Micro released +${microReview.log.points_awarded} pts (+10% audit); Macro routed to pending_expert_review.`
  );

  // 6. Test Step 4 Expert Adjudication & Penalty Mechanics
  // 6a. Expert scores Macro-Transaction across 6 criteria -> releases points
  const expertMacro = await performExpertAdjudication({
    actorId: 'usr-expert-01',
    logId: finalStep.createdLogId!,
    action: 'approve_macro',
    criteriaScores: {
      relevance: 95,
      business: 92,
      feasibility: 90,
      student_ownership: 94,
      sustainability: 96,
      institutional_commitment: 95,
    },
  });
  assert.equal(expertMacro.log.status, 'approved');
  assert.ok(expertMacro.log.points_awarded > 100);

  // 6b. Expert flags Micro-Transaction `log-107` as fraudulent during 10% random audit -> deducts -75 pts from school!
  const beforeSnap = getFullPlatformSnapshot();
  const sch06Before = beforeSnap.schools.find((s) => s.id === 'sch-06')!.penalty_points_deducted;

  const fraudAudit = await performExpertAdjudication({
    actorId: 'usr-expert-01',
    logId: 'log-107',
    action: 'audit_fraud',
    notesOrReason: 'Scale ticket missing in random 10% audit.',
  });
  assert.equal(fraudAudit.log.status, 'fraud_revoked');
  assert.equal(fraudAudit.log.points_awarded, 0);
  assert.equal(fraudAudit.log.penalty_points, 75);

  const afterSnap = getFullPlatformSnapshot();
  const sch06After = afterSnap.schools.find((s) => s.id === 'sch-06')!.penalty_points_deducted;
  assert.equal(sch06After, sch06Before + 75);
  console.log(
    `✅ [6/7] Expert Scoring & Penalty Mechanics: Macro scored (+${expertMacro.log.points_awarded} pts); Fraudulent micro audit deducted -75 pts from SCH-06.`
  );

  // 7. Test Step 5 Resolution Loop: Single Resubmission Attempt Enforcement
  const resubmitChatId = 999002;
  const resubStart = await handleTelegramBotUpdate({
    chatId: resubmitChatId,
    text: '/resubmit log-108',
  });
  assert.equal(resubStart.ok, true);
  assert.equal(resubStart.stage, 'AWAITING_DOCUMENT');

  await handleTelegramBotUpdate({
    chatId: resubmitChatId,
    document: {
      fileName: 'CLEAR_SCALE_RESUBMIT.JPG',
      mimeType: 'image/jpeg',
      simulatedExif: {
        timestamp: '2026-10-12T11:00:00Z',
        lat: 45.52305,
        lng: -122.67645,
      },
    },
  });
  await handleTelegramBotUpdate({
    chatId: resubmitChatId,
    text: 'Copper Heat-Sink Recovery Batch #4 (Resubmitted)',
  });
  await handleTelegramBotUpdate({ chatId: resubmitChatId, text: '9.5' });
  const resubComplete = await handleTelegramBotUpdate({
    chatId: resubmitChatId,
    text: '32',
  });
  assert.equal(resubComplete.ok, true);

  // Attempting a 2nd resubmission on `log-108` MUST be rejected!
  const secondResubAttempt = await handleTelegramBotUpdate({
    chatId: resubmitChatId,
    text: '/resubmit log-108',
  });
  assert.equal(secondResubAttempt.ok, false);
  assert.ok(secondResubAttempt.botReply.includes('RESOLUTION LOOP LOCKED'));
  console.log(
    '✅ [7/7] Step 5 Resolution Loop: 1st resubmission succeeded; 2nd resubmission locked & rejected.'
  );

  console.log('\n🎉 ALL 7 CORE ARCHITECTURAL & VALIDATION TESTS PASSED!');
}

runVerificationSuite().catch((err) => {
  console.error('❌ Verification suite failed:', err);
  process.exit(1);
});
