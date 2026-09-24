import React, { useState, useEffect } from 'react';
import {
  BrazilianUF,
  FinalResult,
  ReceiptSubmissionInput,
  StepExecutionLog,
  StepId,
  StructuredReceiptData,
} from './types/bluepay';
import { SAMPLE_RECEIPTS, SampleReceiptDefinition } from './data/sampleReceipts';
import { FlowchartVisualizer } from './components/FlowchartVisualizer';
import { ReceiptInspector } from './components/ReceiptInspector';
import { HumanReviewModal } from './components/HumanReviewModal';
import { AuditTrailTable } from './components/AuditTrailTable';
import { BluepayEngine, DEFAULT_POLICY } from './pipeline/bluepayEngine';
import { extractReceiptClientSide } from './services/receiptExtractor';
import {
  Play,
  UploadCloud,
  FileText,
  UserCheck,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Sparkles,
  Settings,
  Layers,
  ChevronRight,
  ShieldAlert,
  Sliders,
  Trash2,
  Zap,
} from 'lucide-react';

const BRAZILIAN_UFS: BrazilianUF[] = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const LOCAL_STORAGE_KEY = 'bluepay_audit_records';

export default function App() {
  const [activeTab, setActiveTab] = useState<'runner' | 'flowchart' | 'review' | 'audit' | 'settings'>('runner');
  const [selectedSample, setSelectedSample] = useState<SampleReceiptDefinition>(SAMPLE_RECEIPTS[0]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStepId, setCurrentStepId] = useState<StepId | undefined>(undefined);
  const [activeResult, setActiveResult] = useState<FinalResult | null>(null);
  const [historyRecords, setHistoryRecords] = useState<FinalResult[]>([]);
  const [reviewModalTarget, setReviewModalTarget] = useState<FinalResult | null>(null);

  // Custom upload form state
  const [customFile, setCustomFile] = useState<{
    name: string;
    sizeKb: number;
    fileType: string;
    base64: string;
    previewUrl?: string;
    dimensions?: { width: number; height: number };
  } | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState<string>('Matheus Oliveira');
  const [employeeCpf, setEmployeeCpf] = useState<string>('700.705.441-23');
  const [policyCategory, setPolicyCategory] = useState<'food' | 'fuel' | 'travel' | 'office'>('food');

  // Load audit history from localStorage on initial render
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHistoryRecords(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('Could not load stored audit trail:', e);
    }
  }, []);

  // Save history records to localStorage on changes
  const saveRecords = (records: FinalResult[]) => {
    setHistoryRecords(records);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.warn('Could not save audit trail to localStorage:', e);
    }
  };

  // Handle custom receipt upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorNotice(null);
    const fileType = file.type || 'image/jpeg';
    const reader = new FileReader();

    reader.onload = (event) => {
      const base64 = event.target?.result as string;

      if (fileType.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          setCustomFile({
            name: file.name,
            sizeKb: Math.max(1, Math.round(file.size / 1024)),
            fileType,
            base64,
            previewUrl: base64,
            dimensions: { width: img.naturalWidth, height: img.naturalHeight },
          });
        };
        img.onerror = () => {
          setCustomFile({
            name: file.name,
            sizeKb: Math.max(1, Math.round(file.size / 1024)),
            fileType,
            base64,
            previewUrl: base64,
          });
        };
        img.src = base64;
      } else {
        setCustomFile({
          name: file.name,
          sizeKb: Math.max(1, Math.round(file.size / 1024)),
          fileType,
          base64,
          previewUrl: undefined,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Run the complete 22-step pipeline purely in the client frontend
  const runPipeline = async (submissionPayload: ReceiptSubmissionInput) => {
    setIsProcessing(true);
    setCurrentStepId('SUBMISSION');
    setActiveResult(null);
    setErrorNotice(null);

    try {
      // 1. Configure the custom AI/OCR extractor for client-side execution
      let customAiExtractor: ((inp: ReceiptSubmissionInput) => Promise<StructuredReceiptData>) | undefined;

      if (submissionPayload.samplePreloadId) {
        const match = SAMPLE_RECEIPTS.find((s) => s.id === submissionPayload.samplePreloadId);
        if (match) {
          customAiExtractor = async () => match.extractedMock;
        }
      } else {
        customAiExtractor = async (inp) => {
          return await extractReceiptClientSide(
            inp.filename,
            inp.fileBase64,
            inp.imageDimensions,
            inp.fileSizeKb
          );
        };
      }

      // 2. Instantiate and execute the Bluepay Engine directly in the frontend
      const engine = new BluepayEngine();
      const result = await engine.executeFlow(submissionPayload, {
        aiExtractor: customAiExtractor,
      });

      // 3. Animate stepping through each node in the execution trail for visual clarity
      for (const log of result.executionTrail) {
        setCurrentStepId(log.stepId);
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      // 4. Update active result and audit history
      setActiveResult(result);
      const updatedHistory = [result, ...historyRecords.filter((r) => r.submissionId !== result.submissionId)];
      saveRecords(updatedHistory);
    } catch (err: any) {
      console.error('Error executing pipeline in frontend:', err);
      setErrorNotice(err.message || 'Falha ao executar pipeline');
    } finally {
      setIsProcessing(false);
      setCurrentStepId(undefined);
    }
  };

  // Resolve Human Review (Análise Humana) purely in the client frontend
  const handleResolveHumanReview = async (decision: {
    submissionId: string;
    action: 'APPROVE_INTEGRAL' | 'APPROVE_PARTIAL' | 'REJECT' | 'REQUEST_RESUBMIT';
    overrideEligibleAmount: number;
    justification: string;
    reviewerName: string;
  }) => {
    const updated = historyRecords.map((record) => {
      if (record.submissionId !== decision.submissionId) return record;

      let finalStatus: FinalResult['status'];
      let finalEligibleAmount = record.eligibleAmount;

      switch (decision.action) {
        case 'APPROVE_INTEGRAL':
          finalStatus = 'Aprovado';
          finalEligibleAmount = record.provenAmount;
          break;
        case 'APPROVE_PARTIAL':
          finalStatus = 'Aprovado parcialmente';
          finalEligibleAmount =
            typeof decision.overrideEligibleAmount === 'number'
              ? decision.overrideEligibleAmount
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
          finalStatus = record.status;
      }

      const updatedRecord: FinalResult = {
        ...record,
        status: finalStatus,
        eligibleAmount: finalEligibleAmount,
        humanReviewRequired: false,
        humanReviewDecision: {
          reviewerName: decision.reviewerName,
          decidedAt: new Date().toISOString(),
          action: decision.action,
          overrideEligibleAmount: finalEligibleAmount,
          justification: decision.justification,
        },
        executionTrail: [
          ...record.executionTrail,
          {
            stepId: 'RESULT_STATUS',
            name: `Human Review Completed: ${finalStatus}`,
            namePt: `Análise Humana Concluída: ${finalStatus}`,
            status: 'passed',
            timestamp: new Date().toISOString(),
            durationMs: 10,
            details: `Auditor ${decision.reviewerName} decidiu status "${finalStatus}". Valor elegível final: R$ ${finalEligibleAmount.toFixed(2)}. Justificativa: ${decision.justification}`,
          },
        ],
      };

      if (activeResult?.submissionId === updatedRecord.submissionId) {
        setActiveResult(updatedRecord);
      }

      return updatedRecord;
    });

    saveRecords(updated);
  };

  const handleClearHistory = () => {
    saveRecords([]);
    setActiveResult(null);
  };

  const pendingReviewCount = historyRecords.filter((r) => r.humanReviewRequired).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* HEADER */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center font-black text-white text-base shadow-sm">
              BP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  Bluepay
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  OCR / Reembolso Frontend
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Motor de Auditoria Fiscal & Decisão Automatizada (100% Client-Side)
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('runner')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'runner'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Play className="w-3.5 h-3.5" /> Executar Trilha
            </button>
            <button
              onClick={() => setActiveTab('flowchart')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'flowchart'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Fluxograma Oficial
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 relative ${
                activeTab === 'review'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" /> Análise Humana
              {pendingReviewCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                  {pendingReviewCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Livro de Auditoria
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> SEFAZ & Políticas
            </button>
          </nav>

          {/* Engine Status Indicator */}
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium hidden sm:inline">Motor Frontend:</span>
            <span className="text-emerald-400 font-bold">100% Ativo</span>
          </div>
        </div>
      </header>

      {/* MAIN BODY */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* TAB 1: RUNNER (Submission & Execution) */}
        {activeTab === 'runner' && (
          <div className="space-y-8">
            {errorNotice && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorNotice}</span>
                </div>
                <button
                  onClick={() => setErrorNotice(null)}
                  className="text-rose-500 font-bold hover:text-rose-700 p-1"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Top Row: Intake Card + 1-Click Samples */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Sample Receipts representing real test scenarios */}
              <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Comprovantes de Teste Bluepay
                  </div>
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    1-Click
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Selecione um dos recibos reais para testar as ramificações do fluxograma, ou envie um arquivo novo:
                </p>

                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {SAMPLE_RECEIPTS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedSample(s);
                        setCustomFile(null);
                        setErrorNotice(null);
                      }}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition ${
                        selectedSample.id === s.id && !customFile
                          ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-200'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <div className="font-bold text-slate-900">{s.label}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {s.description}
                      </div>
                      <div className="text-[10px] font-semibold text-blue-700 mt-1">
                        🎯 {s.targetBranch}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Execution Configuration & Launch */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Entrada de Comprovante & Dados do Colaborador
                    </h3>
                    <p className="text-xs text-slate-500">
                      Dispare a esteira completa com verificação fiscal SEFAZ e OCR no navegador
                    </p>
                  </div>

                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> 22 Passos Mapeados
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Colaborador Solicitante
                    </label>
                    <input
                      type="text"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      CPF do Colaborador
                    </label>
                    <input
                      type="text"
                      value={employeeCpf}
                      onChange={(e) => setEmployeeCpf(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Política de Despesa
                    </label>
                    <select
                      value={policyCategory}
                      onChange={(e: any) => setPolicyCategory(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                    >
                      <option value="food">Alimentação / Refeição (Teto R$ 60)</option>
                      <option value="fuel">Combustível (Teto R$ 250)</option>
                      <option value="office">Suprimentos & Escritório</option>
                      <option value="travel">Deslocamento Corporativo</option>
                    </select>
                  </div>
                </div>

                {/* Upload or Active Sample Indicator */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {customFile?.previewUrl ? (
                      <img
                        src={customFile.previewUrl}
                        alt="Preview"
                        className="w-12 h-12 rounded-lg object-cover border border-blue-400 shadow-xs"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        {customFile ? customFile.name : selectedSample.submission.filename}
                        {customFile && (
                          <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                            Arquivo Novo Enviado
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {customFile
                          ? `Comprovante pessoal (${customFile.sizeKb} KB, ${customFile.dimensions ? `${customFile.dimensions.width}x${customFile.dimensions.height} px` : customFile.fileType})`
                          : `${selectedSample.label} (${selectedSample.submission.fileSizeKb} KB)`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {customFile && (
                      <button
                        type="button"
                        onClick={() => setCustomFile(null)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-medium transition"
                      >
                        Limpar
                      </button>
                    )}

                    <label className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-white text-xs font-medium cursor-pointer transition flex items-center gap-1.5 shadow-xs">
                      <UploadCloud className="w-3.5 h-3.5" />
                      {customFile ? 'Trocar Arquivo' : 'Enviar Comprovante'}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      disabled={isProcessing}
                      onClick={() => {
                        const payload: ReceiptSubmissionInput = customFile
                          ? {
                              filename: customFile.name,
                              fileSizeKb: customFile.sizeKb,
                              fileType: customFile.fileType,
                              fileBase64: customFile.base64,
                              imageDimensions: customFile.dimensions,
                              employeeId: 'EMP-4091',
                              employeeName,
                              employeeCpf,
                              submissionDate: new Date().toISOString(),
                              policyCategory,
                            }
                          : {
                              ...selectedSample.submission,
                              employeeName,
                              employeeCpf,
                              policyCategory,
                              samplePreloadId: selectedSample.id,
                            };
                        runPipeline(payload);
                      }}
                      className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-2 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Processando Trilha...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-white" /> Executar Fluxograma
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Section: Active Flowchart Stepper */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Visualização da Trilha de Execução do Fluxograma
                </h3>
                {isProcessing && (
                  <span className="text-xs font-bold text-blue-600 animate-pulse flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Executando nó: {currentStepId}
                  </span>
                )}
              </div>

              <FlowchartVisualizer
                currentStepId={currentStepId}
                executionTrail={activeResult?.executionTrail}
              />
            </div>

            {/* Bottom Section: Result Inspector if available */}
            {activeResult && (
              <ReceiptInspector
                result={activeResult}
                previewImage={customFile?.previewUrl}
                onTriggerHumanReview={() => setReviewModalTarget(activeResult)}
              />
            )}
          </div>
        )}

        {/* TAB 2: FULL FLOWCHART SPECIFICATION */}
        {activeTab === 'flowchart' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Fluxograma Oficial de OCR & Reembolso — IA (Bluepay)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Mapeamento estrito dos 22 nós, ramificações de decisão e critérios de auditoria
                  </p>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                  Fonte da Verdade
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-2">
                <p>
                  <strong>Regras Mandatórias Implementadas:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>
                    <strong>Nó 1 a 3:</strong> Envio do Comprovante $\rightarrow$ Verificar Qualidade $\rightarrow$ Qualidade Suficiente? (NÃO $\rightarrow$ Solicitar Novo Envio).
                  </li>
                  <li>
                    <strong>Nó 4 a 6:</strong> Dentro do Prazo de 30 dias? (NÃO $\rightarrow$ Reprovado) $\rightarrow$ Verificar Duplicidade de Arquivo/Chave (SIM $\rightarrow$ Reprovado).
                  </li>
                  <li>
                    <strong>Nó 7 a 11:</strong> QR Code/Chave Disponível? (SIM $\rightarrow$ Leitura $\rightarrow$ Validação Fiscal SEFAZ $\rightarrow$ Consulta Realizada? NÃO $\rightarrow$ Exceção Notificar RH $\rightarrow$ Análise Humana $\rightarrow$ Doc Fiscal Válido? NÃO $\rightarrow$ Análise Humana).
                  </li>
                  <li>
                    <strong>Nó 12 a 16:</strong> Processamento com IA $\rightarrow$ Dados Estruturados $\rightarrow$ Dados Suficientes? (NÃO $\rightarrow$ Análise Humana) $\rightarrow$ Divergências Críticas? (SIM $\rightarrow$ Análise Humana) $\rightarrow$ IA Segura &ge; 98%? (NÃO $\rightarrow$ Análise Humana).
                  </li>
                  <li>
                    <strong>Nó 17 a 20:</strong> Regras de Reembolso $\rightarrow$ Calcular Valor Elegível (Nenhum valor elegível $\rightarrow$ Reprovado) $\rightarrow$ Suspeita Relevante de Fraude? (SIM $\rightarrow$ Análise Humana; NÃO $\rightarrow$ Decisão Automática: Aprovado ou Aprovado Parcialmente).
                  </li>
                  <li>
                    <strong>Nó 21 e 22:</strong> Análise Humana $\rightarrow$ Resultado / Status Final com Notificação e Livro de Auditoria.
                  </li>
                </ul>
              </div>

              <FlowchartVisualizer
                currentStepId={undefined}
                executionTrail={activeResult?.executionTrail}
              />
            </div>
          </div>
        )}

        {/* TAB 3: HUMAN REVIEW QUEUE */}
        {activeTab === 'review' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-amber-600" />
                    Fila de Análise Humana (Auditor Financeiro)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Comprovantes encaminhados para validação manual por exceção SEFAZ, divergência, baixa confiança IA (&lt;98%) ou suspeita de fraude
                  </p>
                </div>

                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                  {pendingReviewCount} Pendente{pendingReviewCount !== 1 ? 's' : ''}
                </span>
              </div>

              {pendingReviewCount === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  Nenhum comprovante pendente de análise humana no momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {historyRecords
                    .filter((r) => r.humanReviewRequired)
                    .map((item) => (
                      <div
                        key={item.submissionId}
                        className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {item.submissionId}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                              {item.humanReviewReason || 'Encaminhado para Análise'}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-900">
                            {item.employeeName} ({item.employeeCpf || 'Sem CPF'}) • {item.structuredData?.issuerName || 'Emissor a conferir'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Valor Comprovado: R$ {item.provenAmount.toFixed(2)} • Categoria:{' '}
                            {item.policyCategory}
                          </div>
                        </div>

                        <button
                          onClick={() => setReviewModalTarget(item)}
                          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition"
                        >
                          Decidir Valor & Motivo
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LEDGER */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Livro de Registro & Auditoria Fiscal</h3>
                <p className="text-xs text-slate-500">Histórico completo de submissões e decisões persistidas no navegador</p>
              </div>
              {historyRecords.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-medium transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Limpar Histórico
                </button>
              )}
            </div>

            <AuditTrailTable
              records={historyRecords}
              onSelectRecord={(r) => {
                setActiveResult(r);
                setActiveTab('runner');
              }}
              onOpenReview={(r) => setReviewModalTarget(r)}
            />
          </div>
        )}

        {/* TAB 5: SEFAZ & POLICY SETTINGS */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SEFAZ Portals Coverage */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Integração Fiscal SEFAZ (27 UFs)
                </h3>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  100% Cobertura
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Portais autorizadores homologados para consulta de NFC-e (modelo 65) e SAT (modelo 59):
              </p>
              <div className="grid grid-cols-6 gap-2 text-center text-xs font-mono">
                {BRAZILIAN_UFS.map((uf) => (
                  <div
                    key={uf}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-700 hover:bg-blue-50 hover:border-blue-300 transition"
                  >
                    {uf}
                  </div>
                ))}
              </div>
            </div>

            {/* Strict Policy Rules */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Parâmetros Estritos de Política Bluepay
              </h3>
              <ul className="text-xs text-slate-700 space-y-2.5">
                <li className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                  <span>Limiar Mínimo de Confiança IA (SIM &ge; 98%):</span>
                  <strong className="text-blue-700 font-mono">98.0%</strong>
                </li>
                <li className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                  <span>Prazo Máximo de Submissão de Comprovante:</span>
                  <strong className="text-blue-700 font-mono">30 dias</strong>
                </li>
                <li className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                  <span>Teto Diário de Alimentação / Refeição:</span>
                  <strong className="text-blue-700 font-mono">R$ 60,00</strong>
                </li>
                <li className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                  <span>Exigência de Coincidência de CPF se presente:</span>
                  <strong className="text-emerald-700 font-mono">SIM (Divergência Crítica)</strong>
                </li>
                <li className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                  <span>Itens Proibidos (Álcool / Tabaco / etc.):</span>
                  <strong className="text-rose-700 font-mono">Dedução Automática</strong>
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        Bluepay — OCR / Comprovante para Reembolso — IA • Arquitetura 100% Frontend (Strict Flowchart)
      </footer>

      {/* Human Review Decision Modal */}
      {reviewModalTarget && (
        <HumanReviewModal
          submission={reviewModalTarget}
          onClose={() => setReviewModalTarget(null)}
          onResolve={handleResolveHumanReview}
        />
      )}
    </div>
  );
}
