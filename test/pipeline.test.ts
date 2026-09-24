import { BluepayEngine } from '../src/pipeline/bluepayEngine.ts';
import { SAMPLE_RECEIPTS } from '../src/data/sampleReceipts.ts';

async function runAllTests() {
  console.log('====================================================');
  console.log('BLUEPAY OCR & REIMBURSEMENT PIPELINE VERIFICATION');
  console.log('Strict Flowchart Sequence & Path Validation');
  console.log('====================================================\n');

  const engine = new BluepayEngine();
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalCount++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${testName}: ${detail || 'Assertion failed'}`);
      throw new Error(`Test failed: ${testName} - ${detail}`);
    }
  }

  // TEST 1: Brazilian Chave de Acesso Check Digit Algorithm (Módulo 11)
  console.log('--- TEST GROUP 1: SEFAZ Access Key Validation ---');
  // 44-digit valid key from real receipt Celsos: 35260941702224000122650010000005281101406280
  const validKey = '35260941702224000122650010000005281101406280';
  const isKeyValid = engine.validateChaveAcesso(validKey);
  assert(isKeyValid === true, 'Valid 44-digit SEFAZ key check digit matches');

  const invalidKey = '35260941702224000122650010000005281101406289'; // altered check digit
  assert(engine.validateChaveAcesso(invalidKey) === false, 'Tampered check digit correctly detected as invalid');

  // TEST 2: Quality Sufficient? NÃO -> Solicitar Novo Envio
  console.log('\n--- TEST GROUP 2: File Quality Check ---');
  const lowQualitySample = SAMPLE_RECEIPTS.find((s) => s.id === 'low_quality_blurry')!;
  const resLowQuality = await engine.executeFlow(lowQualitySample.submission);
  assert(resLowQuality.status === 'Novo envio solicitado', 'Low quality routes to "Novo envio solicitado"');
  assert(
    resLowQuality.executionTrail.some((t) => t.stepId === 'REQUEST_NEW_SUBMISSION'),
    'Step "REQUEST_NEW_SUBMISSION" recorded in execution trail'
  );

  // TEST 3: Dentro do Prazo? NÃO/RECUSADO -> Reprovado
  console.log('\n--- TEST GROUP 3: Policy Submission Window Deadline ---');
  const pastDeadlineSample = SAMPLE_RECEIPTS.find((s) => s.id === 'past_deadline_expired')!;
  const resPastDeadline = await engine.executeFlow(pastDeadlineSample.submission);
  assert(resPastDeadline.status === 'Reprovado', 'Expired receipt routes to "Reprovado"');
  assert(
    resPastDeadline.executionTrail.some((t) => t.stepId === 'DECISION_WITHIN_DEADLINE'),
    'Step "DECISION_WITHIN_DEADLINE" recorded in execution trail'
  );

  // TEST 4: Mesmo Arquivo Já Enviado? SIM -> Reprovado (Duplicidade)
  console.log('\n--- TEST GROUP 4: Duplicity Detection ---');
  const duplicateSample = SAMPLE_RECEIPTS.find((s) => s.id === 'duplicate_submission')!;
  const resDuplicate = await engine.executeFlow(duplicateSample.submission);
  assert(resDuplicate.status === 'Reprovado', 'Duplicate receipt routes to "Reprovado"');
  assert(
    resDuplicate.reason.toLowerCase().includes('duplicidade'),
    'Reason explicitly notes duplicity'
  );

  // TEST 5: QR Code / Chave Disponível? NÃO -> Caminho Alternativo -> Processamento IA
  console.log('\n--- TEST GROUP 5: No QR/Key Alternative Path ---');
  const noKeySample = SAMPLE_RECEIPTS.find((s) => s.id === 'cnm_no_key_alternative')!;
  const resNoKey = await engine.executeFlow(noKeySample.submission, {
    aiExtractor: async () => noKeySample.extractedMock,
  });
  assert(
    resNoKey.executionTrail.some((t) => t.stepId === 'NO_QR_KEY_ALTERNATIVE_PATH'),
    'Alternative path step executed when QR/Key absent'
  );
  assert(
    resNoKey.executionTrail.some((t) => t.stepId === 'AI_PROCESSING'),
    'Alternative path correctly converges into "PROCESSAMENTO COM IA"'
  );

  // TEST 6: Consulta Realizada? NÃO -> Exceção na Consulta -> Análise Humana
  console.log('\n--- TEST GROUP 6: Fiscal Query SEFAZ Exception ---');
  const sefazExSample = SAMPLE_RECEIPTS.find((s) => s.id === 'sefaz_exception_timeout')!;
  const resSefazEx = await engine.executeFlow(sefazExSample.submission);
  assert(resSefazEx.status === 'Em análise humana', 'SEFAZ timeout routes to "Em análise humana"');
  assert(
    resSefazEx.executionTrail.some((t) => t.stepId === 'FISCAL_QUERY_EXCEPTION'),
    'Exceção na Consulta (Notificar responsável RH) triggered'
  );

  // TEST 7: Documento Fiscal Válido? NÃO -> Análise Humana
  console.log('\n--- TEST GROUP 7: Invalid Fiscal Document (Homologação) ---');
  const invalidDocSample = SAMPLE_RECEIPTS.find((s) => s.id === 'acbr_homologacao_invalid')!;
  const resInvalidDoc = await engine.executeFlow(invalidDocSample.submission);
  assert(resInvalidDoc.status === 'Em análise humana', 'Homologation/Test document routed to "Em análise humana"');
  assert(
    resInvalidDoc.executionTrail.some((t) => t.stepId === 'DECISION_FISCAL_DOC_VALID'),
    'Step "DECISION_FISCAL_DOC_VALID" evaluated'
  );

  // TEST 8: Divergências Críticas? SIM (CPF não confere) -> Análise Humana
  console.log('\n--- TEST GROUP 8: Critical Discrepancies (CPF Mismatch) ---');
  const cpfMismatchSample = SAMPLE_RECEIPTS.find((s) => s.id === 'cpf_mismatch_divergence')!;
  const resCpfMismatch = await engine.executeFlow(cpfMismatchSample.submission, {
    aiExtractor: async () => cpfMismatchSample.extractedMock,
  });
  assert(resCpfMismatch.status === 'Em análise humana', 'CPF divergence routes to "Em análise humana"');
  assert(
    resCpfMismatch.executionTrail.some((t) => t.stepId === 'DECISION_CRITICAL_DISCREPANCIES'),
    'Step "DECISION_CRITICAL_DISCREPANCIES" evaluated as SIM'
  );

  // TEST 9: IA está segura da leitura? NÃO (< 98%) -> Análise Humana
  console.log('\n--- TEST GROUP 9: AI Reading Confidence Threshold ---');
  const lowConfSample = SAMPLE_RECEIPTS.find((s) => s.id === 'low_confidence_ocr')!;
  const resLowConf = await engine.executeFlow(lowConfSample.submission, {
    aiExtractor: async () => lowConfSample.extractedMock,
  });
  assert(resLowConf.status === 'Em análise humana', 'Confidence < 98% routes to "Em análise humana"');
  assert(
    resLowConf.executionTrail.some((t) => t.stepId === 'DECISION_AI_CONFIDENCE_98'),
    'Confidence threshold (>= 98%) enforced'
  );

  // TEST 10: Happy Path: Full Integral Automatic Approval
  console.log('\n--- TEST GROUP 10: Automatic Approval (Integral) ---');
  const celsos32Sample = SAMPLE_RECEIPTS.find((s) => s.id === 'celsos_meal_32')!;
  const resCelsos = await engine.executeFlow(celsos32Sample.submission, {
    aiExtractor: async () => celsos32Sample.extractedMock,
  });
  assert(resCelsos.status === 'Aprovado', 'Valid receipt receives automatic "Aprovado" status');
  assert(resCelsos.provenAmount === 32.0, 'Proven amount is R$ 32.00');
  assert(resCelsos.eligibleAmount === 32.0, 'Eligible amount is R$ 32.00');
  assert(
    resCelsos.executionTrail.some((t) => t.stepId === 'AUTOMATIC_DECISION'),
    'Automatic Decision node executed'
  );

  // TEST 11: Partial Approval: Prohibited Alcohol Item Deducted
  console.log('\n--- TEST GROUP 11: Automatic Approval (Parcial) ---');
  const partialSample = SAMPLE_RECEIPTS.find((s) => s.id === 'reimbursement_partial_alcohol')!;
  const resPartial = await engine.executeFlow(partialSample.submission, {
    aiExtractor: async () => partialSample.extractedMock,
  });
  assert(resPartial.status === 'Aprovado parcialmente', 'Item with alcohol receives "Aprovado parcialmente"');
  assert(resPartial.provenAmount === 68.0, 'Proven amount is total R$ 68.00');
  assert(resPartial.eligibleAmount === 38.0, 'Eligible amount excludes R$ 30 alcohol = R$ 38.00');

  // TEST 12: Custom User Uploaded Receipt Processing (No forced flags)
  console.log('\n--- TEST GROUP 12: Custom User Receipt Upload (Real Flow) ---');
  const customUploadInput = {
    filename: 'whatsapp_receipt_upload_test.jpeg',
    fileSizeKb: 195,
    fileType: 'image/jpeg',
    fileBase64: 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAEASTN7AAAAABJRU5ErkJggg==',
    imageDimensions: { width: 1080, height: 1920 },
    employeeId: 'EMP-4091',
    employeeName: 'Matheus Oliveira',
    employeeCpf: '700.705.441-23',
    submissionDate: new Date().toISOString(),
    policyCategory: 'food' as const,
  };

  const resCustomUpload = await engine.executeFlow(customUploadInput, {
    aiExtractor: async () => ({
      issuerName: 'CELSOS RESTAURANTE',
      issuerCnpj: '41.702.224/0001-22',
      issuerState: 'SP',
      consumerCpf: '700.705.441-23',
      documentType: 'NFC-e',
      emissionDate: new Date().toISOString(),
      accessKey: '35260941702224000122650010000009991101406281',
      items: [
        { description: 'REFEICAO KILO', quantity: 1, unitPrice: 32.0, totalPrice: 32.0, eligible: true }
      ],
      subtotal: 32.0,
      totalAmount: 32.0,
      paymentMethod: 'Cartão Débito',
      isTestEnvironment: false,
      confidenceScore: 99.5,
      fieldConfidence: { total: 99, date: 99, cnpj: 99, items: 99, key: 99 }
    })
  });

  assert(resCustomUpload.status === 'Aprovado', 'Custom upload with valid receipt approves successfully');
  assert(resCustomUpload.provenAmount === 32.0, 'Proven amount is R$ 32.00');
  assert(resCustomUpload.eligibleAmount === 32.0, 'Eligible amount is R$ 32.00');
  assert(resCustomUpload.executionTrail.length >= 10, 'Complete flowchart trail generated for custom uploaded receipt');

  console.log('\n====================================================');
  console.log(`ALL TESTS PASSED: ${passedCount}/${totalCount} assertions verified.`);
  console.log('====================================================\n');
}

runAllTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
