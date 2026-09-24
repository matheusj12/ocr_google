/**
 * Bluepay OCR & AI Reimbursement Engine Types
 * Based directly on the Bluepay Reimbursement Flowchart (fluxoograma_ocr.png)
 */

export type BrazilianUF =
  | 'AC' | 'AL' | 'AP' | 'AM' | 'BA' | 'CE' | 'DF' | 'ES' | 'GO'
  | 'MA' | 'MT' | 'MS' | 'MG' | 'PA' | 'PB' | 'PR' | 'PE' | 'PI'
  | 'RJ' | 'RN' | 'RS' | 'RO' | 'RR' | 'SC' | 'SP' | 'SE' | 'TO';

export type StepId =
  | 'SUBMISSION'
  | 'FILE_QUALITY_CHECK'
  | 'DECISION_QUALITY_SUFFICIENT'
  | 'REQUEST_NEW_SUBMISSION'
  | 'DECISION_WITHIN_DEADLINE'
  | 'CHECK_DUPLICATE'
  | 'DECISION_ALREADY_SUBMITTED'
  | 'DECISION_QR_KEY_AVAILABLE'
  | 'NO_QR_KEY_ALTERNATIVE_PATH'
  | 'READ_QR_OR_KEY'
  | 'FISCAL_VALIDATION'
  | 'DECISION_FISCAL_QUERY_SUCCESS'
  | 'FISCAL_QUERY_EXCEPTION'
  | 'DECISION_FISCAL_DOC_VALID'
  | 'AI_PROCESSING'
  | 'STRUCTURED_DATA'
  | 'DECISION_DATA_SUFFICIENT'
  | 'DECISION_CRITICAL_DISCREPANCIES'
  | 'DECISION_AI_CONFIDENCE_98'
  | 'REIMBURSEMENT_RULES'
  | 'CALCULATE_ELIGIBLE_AMOUNT'
  | 'DECISION_FRAUD_SUSPICION'
  | 'AUTOMATIC_DECISION'
  | 'HUMAN_ANALYSIS'
  | 'RESULT_STATUS';

export type FlowNodeStatus = 'pending' | 'active' | 'passed' | 'failed' | 'diverted' | 'skipped';

export interface StepExecutionLog {
  stepId: StepId;
  name: string;
  namePt: string;
  status: FlowNodeStatus;
  timestamp: string;
  durationMs: number;
  details: string;
  dataSnapshot?: Record<string, any>;
}

export interface ReceiptItem {
  code?: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  totalPrice: number;
  eligible: boolean;
  category?: 'meal' | 'fuel' | 'transport' | 'office' | 'prohibited' | 'general';
  ineligibilityReason?: string;
}

export interface StructuredReceiptData {
  issuerName: string;
  issuerCnpj: string;
  issuerAddress?: string;
  issuerState?: BrazilianUF | string;
  consumerCpf?: string;
  consumerName?: string;
  documentNumber?: string;
  documentSeries?: string;
  documentType: 'NFC-e' | 'SAT' | 'NF-e' | 'Cupom' | 'Desconhecido';
  emissionDate: string; // ISO or YYYY-MM-DD HH:mm:ss
  accessKey?: string;
  authorizationProtocol?: string;
  items: ReceiptItem[];
  subtotal: number;
  totalAmount: number;
  paymentMethod: string;
  isTestEnvironment: boolean;
  confidenceScore: number; // 0 to 100 percentage (e.g. 99.2)
  fieldConfidence: {
    total: number;
    date: number;
    cnpj: number;
    items: number;
    key: number;
  };
}

export interface ReceiptSubmissionInput {
  id?: string;
  filename: string;
  fileBase64?: string;
  fileSizeKb: number;
  fileType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf' | string;
  imageDimensions?: { width: number; height: number };
  employeeId: string;
  employeeName: string;
  employeeCpf: string;
  submissionDate: string; // ISO string
  policyCategory?: 'food' | 'fuel' | 'travel' | 'office';
  // Optional pre-configured mock/overrides for deterministic testing
  forcedQualitySufficient?: boolean;
  forcedWithinDeadline?: boolean;
  forcedDuplicate?: boolean;
  forcedQrAvailable?: boolean;
  forcedFiscalSuccess?: boolean;
  forcedFiscalValid?: boolean;
  forcedCriticalDivergence?: boolean;
  forcedConfidence?: number;
  forcedFraudSuspicion?: boolean;
  samplePreloadId?: string;
}

export type FinalStatusType =
  | 'Aprovado'
  | 'Aprovado parcialmente'
  | 'Reprovado'
  | 'Novo envio solicitado'
  | 'Em análise humana';

export interface FinalResult {
  submissionId: string;
  status: FinalStatusType;
  provenAmount: number; // Valor comprovado: R$ X
  eligibleAmount: number; // Valor elegível: R$ Y
  reason: string; // Motivo + registro
  policyCategory: string;
  employeeId: string;
  employeeName: string;
  employeeCpf: string;
  processedAt: string;
  executionTrail: StepExecutionLog[];
  structuredData?: StructuredReceiptData;
  humanReviewRequired: boolean;
  humanReviewReason?: string;
  humanReviewDecision?: {
    reviewerName: string;
    decidedAt: string;
    action: 'APPROVE_INTEGRAL' | 'APPROVE_PARTIAL' | 'REJECT' | 'REQUEST_RESUBMIT';
    overrideEligibleAmount: number;
    justification: string;
  };
}

export interface ReimbursementPolicyConfig {
  maxDaysSubmissionWindow: number; // e.g. 30 days
  mealDailyCap: number; // e.g. R$ 60.00
  fuelMaxSingleExpense: number; // e.g. R$ 250.00
  requireCpfMatchIfPresent: boolean;
  minAiConfidenceThreshold: number; // 98% as required by Bluepay flowchart
  prohibitedKeywords: string[]; // e.g. ["cerveja", "chopp", "vinho", "cigarro", "whisky"]
}
