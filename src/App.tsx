import React, { useState, useEffect } from 'react';
import {
  BrazilianUF,
  FinalResult,
  ReceiptSubmissionInput,
  StepExecutionLog,
  StepId,
} from './types/bluepay';
import { SAMPLE_RECEIPTS, SampleReceiptDefinition } from './data/sampleReceipts';
import { FlowchartVisualizer } from './components/FlowchartVisualizer';
import { ReceiptInspector } from './components/ReceiptInspector';
import { HumanReviewModal } from './components/HumanReviewModal';
import { AuditTrailTable } from './components/AuditTrailTable';
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
} from 'lucide-react';

const BRAZILIAN_UFS: BrazilianUF[] = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

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

  // Load audit history on mount
  useEffect(() => {
    fetch('/api/audit-trail')
      .then((res) => res.json())
      .then((data) => {
        if (data.history) {
          setHistoryRecords(data.history);
        }
      })
      .catch(() => {});
  }, []);

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

  // Run the complete 22-step pipeline
  const runPipeline = async (submissionPayload: ReceiptSubmissionInput) => {
    setIsProcessing(true);
    setCurrentStepId('SUBMISSION');
    setActiveResult(null);
    setErrorNotice(null);

    try {
      const response = await fetch('/api/pipeline/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to process receipt');
      }

      const result: FinalResult = data.result;

      // Animate stepping through the execution trail for visual compliance
      for (const log of result.executionTrail) {
        setCurrentStepId(log.stepId);
        await new Promise((resolve) => setTimeout(resolve, 180));
      }

      setActiveResult(result);
      setHistoryRecords((prev) => [result, ...prev.filter((r) => r.submissionId !== result.submissionId)]);
    } catch (err: any) {
      console.error('Error executing pipeline:', err);
      setErrorNotice(err.message || 'Falha ao executar pipeline');
    } finally {
      setIsProcessing(false);
      setCurrentStepId(undefined);
    }
  };

  const handleResolveHumanReview = async (decision: {
    submissionId: string;
    action: 'APPROVE_INTEGRAL' | 'APPROVE_PARTIAL' | 'REJECT' | 'REQUEST_RESUBMIT';
    overrideEligibleAmount: number;
    justification: string;
    reviewerName: string;
  }) => {
    const response = await fetch('/api/human-review/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decision),
    });

    const data = await response.json();
    if (data.success && data.result) {
      const updated: FinalResult = data.result;
      if (activeResult?.submissionId === updated.submissionId) {
        setActiveResult(updated);
      }
      setHistoryRecords((prev) =>
        prev.map((r) => (r.submissionId === updated.submissionId ? updated : r))
      );
    }
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
                  OCR / IA Reembolso
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Motor de Auditoria Fiscal & Decisão Automatizada
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

          {/* SEFAZ Status Pill */}
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium hidden sm:inline">SEFAZ 27 UFs:</span>
            <span className="text-emerald-400 font-bold">Online</span>
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
              {/* Left Column: Sample Receipts representing the user's provided photos */}
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
                  Selecione um dos recibos reais fornecidos para percorrer as diferentes rotas do fluxograma:
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
                      Dispare a esteira completa com verificação fiscal SEFAZ e OCR
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
                            Arquivo Novo
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {customFile
                          ? `Comprovante pessoal (${customFile.sizeKb} KB, ${customFile.dimensions ? `${customFile.dimensions.width}x${customFile.dimensions.height}` : customFile.fileType})`
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

        {/* TAB 2: FLOWCHART ARCHITECTURE */}
        {activeTab === 'flowchart' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Arquitetura Completa: OCR / Comprovante para Reembolso Bluepay
                  </h2>
                  <p className="text-xs text-slate-500">
                    Diagrama interativo e trilha de auditoria seguindo rigorosamente o modelo
                    especificado em fluxoograma_ocr.png
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                  Estrito Cumprimento de Fluxo
                </div>
              </div>

              <FlowchartVisualizer
                currentStepId={currentStepId}
                executionTrail={activeResult?.executionTrail}
              />
            </div>
          </div>
        )}

        {/* TAB 3: HUMAN REVIEW (Análise Humana) */}
        {activeTab === 'review' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-amber-600" />
                    Fila de Análise Humana (Auditoria)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Comprovantes retidos por dados insuficientes, baixa confiança (&lt; 98%), divergência
                    de CPF, exceção SEFAZ ou suspeita fiscal.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300">
                  {pendingReviewCount} pendente{pendingReviewCount === 1 ? '' : 's'}
                </span>
              </div>

              {pendingReviewCount === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <div className="font-bold text-slate-700">Nenhum comprovante pendente de análise humana!</div>
                  <div>Todos os envios foram aprovados automaticamente ou já auditados.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyRecords
                    .filter((r) => r.humanReviewRequired)
                    .map((item) => (
                      <div
                        key={item.submissionId}
                        className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-700">
                              #{item.submissionId}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-bold">
                              {item.status}
                            </span>
                            <span className="text-xs font-semibold text-slate-900">
                              {item.employeeName} ({item.employeeCpf})
                            </span>
                          </div>
                          <div className="text-xs text-slate-700 font-medium">
                            {item.reason}
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
          <AuditTrailTable
            records={historyRecords}
            onSelectRecord={(r) => {
              setActiveResult(r);
              setActiveTab('runner');
            }}
            onOpenReview={(r) => setReviewModalTarget(r)}
          />
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
        Bluepay — OCR / Comprovante para Reembolso — IA • Arquitetura Fiel ao Fluxograma
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
