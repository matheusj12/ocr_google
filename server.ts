import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { BluepayEngine } from './src/pipeline/bluepayEngine.ts';
import { extractReceiptWithGemini } from './src/services/geminiService.ts';
import { SAMPLE_RECEIPTS } from './src/data/sampleReceipts.ts';
import { FinalResult, ReceiptSubmissionInput, StructuredReceiptData } from './src/types/bluepay.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Increase JSON payload size for base64 images
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// In-memory persistent state for submissions and audit logs
const SUBMISSIONS_CACHE: Map<string, FinalResult> = new Map();
const engine = new BluepayEngine();

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// 1. Get sample receipts catalog
app.get('/api/samples', (_req: Request, res: Response) => {
  res.json({
    success: true,
    samples: SAMPLE_RECEIPTS,
  });
});

// 2. Audit trail history
app.get('/api/audit-trail', (_req: Request, res: Response) => {
  const history = Array.from(SUBMISSIONS_CACHE.values()).reverse();
  res.json({
    success: true,
    history,
  });
});

// 3. Process receipt through the strict Bluepay flowchart pipeline
app.post('/api/pipeline/process', async (req: Request, res: Response) => {
  try {
    const input: ReceiptSubmissionInput = req.body;

    if (!input.filename) {
      res.status(400).json({ success: false, error: 'Filename is required' });
      return;
    }

    // Determine AI Extractor:
    // If client uploaded a real base64 file and server has GEMINI_API_KEY, use real Gemini Multimodal OCR
    // If it is one of the user-provided preloaded receipts, use the pre-extracted data with option for AI
    let customAiExtractor: ((inp: ReceiptSubmissionInput) => Promise<StructuredReceiptData>) | undefined;

    if (input.samplePreloadId) {
      const match = SAMPLE_RECEIPTS.find((s) => s.id === input.samplePreloadId);
      if (match) {
        customAiExtractor = async () => match.extractedMock;
      }
    } else if (input.fileBase64) {
      customAiExtractor = async (inp) => {
        try {
          return await extractReceiptWithGemini(inp.fileBase64!, inp.fileType || 'image/jpeg');
        } catch (err: any) {
          console.error('Receipt extraction exception:', err);
          return {
            issuerName: 'Comprovante Manual (OCR Inconclusivo)',
            issuerCnpj: '',
            documentType: 'Desconhecido',
            emissionDate: new Date().toISOString(),
            items: [
              {
                description: 'Despesa a conferir pelo auditor',
                quantity: 1,
                unitPrice: 0,
                totalPrice: 0,
                eligible: true,
              },
            ],
            subtotal: 0,
            totalAmount: 0,
            paymentMethod: 'A verificar',
            isTestEnvironment: false,
            confidenceScore: 30.0,
            fieldConfidence: { total: 0, date: 0, cnpj: 0, items: 0, key: 0 },
          };
        }
      };
    }

    const result = await engine.executeFlow(input, {
      aiExtractor: customAiExtractor,
    });

    // Store in submission cache
    SUBMISSIONS_CACHE.set(result.submissionId, result);

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Pipeline execution error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during receipt pipeline execution',
    });
  }
});

// 4. Resolve human analysis review (Análise Humana)
app.post('/api/human-review/resolve', (req: Request, res: Response) => {
  try {
    const {
      submissionId,
      action, // 'APPROVE_INTEGRAL' | 'APPROVE_PARTIAL' | 'REJECT' | 'REQUEST_RESUBMIT'
      overrideEligibleAmount,
      justification,
      reviewerName = 'Auditor Financeiro Bluepay',
    } = req.body;

    const record = SUBMISSIONS_CACHE.get(submissionId);
    if (!record) {
      res.status(404).json({ success: false, error: 'Submission not found' });
      return;
    }

    let finalStatus: FinalResult['status'];
    let finalEligibleAmount = record.eligibleAmount;

    switch (action) {
      case 'APPROVE_INTEGRAL':
        finalStatus = 'Aprovado';
        finalEligibleAmount = record.provenAmount;
        break;
      case 'APPROVE_PARTIAL':
        finalStatus = 'Aprovado parcialmente';
        finalEligibleAmount =
          typeof overrideEligibleAmount === 'number'
            ? overrideEligibleAmount
            : record.eligibleAmount;
        break;
      case 'REJECT':
        finalStatus = 'Reprovado';
        finalEligibleAmount = 0;
        break;
      case 'REQUEST_RESUBMIT':
        finalStatus = 'Novo envio solicitado';
        finalEligibleAmount = 0;
        break;
      default:
        res.status(400).json({ success: false, error: 'Invalid reviewer action' });
        return;
    }

    record.status = finalStatus;
    record.eligibleAmount = finalEligibleAmount;
    record.humanReviewRequired = false;
    record.humanReviewDecision = {
      reviewerName,
      decidedAt: new Date().toISOString(),
      action,
      overrideEligibleAmount: finalEligibleAmount,
      justification,
    };

    // Append resolution to audit trail
    record.executionTrail.push({
      stepId: 'RESULT_STATUS',
      name: `Human Review Completed: ${finalStatus}`,
      namePt: `Análise Humana Concluída: ${finalStatus}`,
      status: 'passed',
      timestamp: new Date().toISOString(),
      durationMs: 12,
      details: `Auditor ${reviewerName} resolved status to ${finalStatus}. Valor elegível: R$ ${finalEligibleAmount.toFixed(2)}. Justificativa: ${justification}`,
    });

    SUBMISSIONS_CACHE.set(submissionId, record);

    res.json({
      success: true,
      result: record,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. SEFAZ Chave de Acesso verification endpoint
app.post('/api/sefaz/verify-key', (req: Request, res: Response) => {
  const { key } = req.body;
  if (!key) {
    res.status(400).json({ valid: false, error: 'Key required' });
    return;
  }
  const valid = engine.validateChaveAcesso(key);
  res.json({
    valid,
    key,
    stateCode: key.substring(0, 2),
    model: key.length === 44 ? key.substring(20, 22) : 'Unknown',
  });
});

// -------------------------------------------------------------
// VITE DEV SERVER / STATIC PRODUCTION MIDDLEWARE
// -------------------------------------------------------------
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Bluepay Reimbursement Engine server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
