import React from 'react';
import { StepId, StepExecutionLog } from '../types/bluepay';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, ShieldCheck, UserCheck, Bot, FileText, Clock, RefreshCw } from 'lucide-react';

interface FlowchartVisualizerProps {
  currentStepId?: StepId;
  executionTrail?: StepExecutionLog[];
  onSelectStep?: (stepId: StepId) => void;
}

export const FlowchartVisualizer: React.FC<FlowchartVisualizerProps> = ({
  currentStepId,
  executionTrail = [],
  onSelectStep,
}) => {
  const getStepStatus = (id: StepId) => {
    if (currentStepId === id) return 'active';
    const log = executionTrail.find((t) => t.stepId === id);
    if (!log) return 'inactive';
    return log.status; // 'passed' | 'failed' | 'diverted'
  };

  const getNodeClass = (id: StepId, isDecision = false) => {
    const status = getStepStatus(id);
    const base = isDecision
      ? 'border-2 rotate-0 transition-all duration-300 p-3 text-center cursor-pointer shadow-sm relative'
      : 'border-2 transition-all duration-300 p-3.5 text-center cursor-pointer shadow-sm rounded-xl relative';

    if (status === 'active') {
      return `${base} border-blue-500 bg-blue-50/90 text-blue-900 ring-4 ring-blue-200 scale-105 z-10`;
    }
    if (status === 'passed') {
      return `${base} border-emerald-500 bg-emerald-50/80 text-emerald-950`;
    }
    if (status === 'failed') {
      return `${base} border-rose-500 bg-rose-50/90 text-rose-950`;
    }
    if (status === 'diverted') {
      return `${base} border-amber-500 bg-amber-50/90 text-amber-950`;
    }
    return `${base} border-slate-200 bg-white hover:border-blue-300 text-slate-700 hover:shadow`;
  };

  return (
    <div className="w-full bg-slate-50/70 border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              Bluepay Architecture
            </span>
            <span className="text-xs text-slate-500">Source: fluxoograma_ocr.png</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            OCR / Comprovante para Reembolso — IA — Bluepay
          </h3>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Inativo
          </span>
          <span className="flex items-center gap-1 text-blue-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block animate-pulse" /> Ativo
          </span>
          <span className="flex items-center gap-1 text-emerald-700 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Aprovado / SIM
          </span>
          <span className="flex items-center gap-1 text-amber-700 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Desvio / Humano
          </span>
          <span className="flex items-center gap-1 text-rose-700 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Reprovado / NÃO
          </span>
        </div>
      </div>

      {/* Structured flowchart stages view */}
      <div className="min-w-[900px] flex flex-col gap-6 items-center">
        {/* STAGE 1: INTAKE & QUALITY */}
        <div className="w-full max-w-2xl flex flex-col items-center gap-3">
          <div
            onClick={() => onSelectStep?.('SUBMISSION')}
            className={`w-80 ${getNodeClass('SUBMISSION')}`}
          >
            <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <FileText className="w-3.5 h-3.5" /> Entrada
            </div>
            <div className="font-semibold text-sm mt-0.5">ENVIO DO COMPROVANTE</div>
            <div className="text-xs text-slate-500">PDF / Imagem (JPEG, PNG, WebP)</div>
          </div>

          <div className="text-slate-400">↓</div>

          <div
            onClick={() => onSelectStep?.('FILE_QUALITY_CHECK')}
            className={`w-80 ${getNodeClass('FILE_QUALITY_CHECK')}`}
          >
            <div className="font-semibold text-sm">VERIFICAR QUALIDADE DO ARQUIVO</div>
            <div className="text-xs text-slate-500">Resolução, nitidez & legibilidade</div>
          </div>

          <div className="text-slate-400">↓</div>

          {/* Decision: Qualidade Suficiente? */}
          <div className="flex items-center gap-6 justify-center w-full">
            <div
              onClick={() => onSelectStep?.('REQUEST_NEW_SUBMISSION')}
              className={`w-52 ${getNodeClass('REQUEST_NEW_SUBMISSION')}`}
            >
              <div className="text-xs font-bold text-rose-600">NÃO</div>
              <div className="font-semibold text-xs mt-0.5">SOLICITAR NOVO ENVIO</div>
              <div className="text-[11px] text-slate-500">Reenviar foto nítida</div>
            </div>

            <div className="text-rose-400">←</div>

            <div
              onClick={() => onSelectStep?.('DECISION_QUALITY_SUFFICIENT')}
              className={`w-64 border-amber-300 ${getNodeClass('DECISION_QUALITY_SUFFICIENT', true)} rounded-lg`}
            >
              <div className="text-xs font-bold text-amber-800 uppercase">Decisão</div>
              <div className="font-bold text-sm text-slate-800">QUALIDADE SUFICIENTE?</div>
            </div>

            <div className="text-emerald-500 font-bold text-xs">SIM ↓</div>
          </div>

          <div className="text-slate-400">↓</div>

          {/* Decision: Dentro do Prazo? */}
          <div className="flex items-center gap-6 justify-center w-full">
            <div
              onClick={() => onSelectStep?.('DECISION_WITHIN_DEADLINE')}
              className={`w-64 border-amber-300 ${getNodeClass('DECISION_WITHIN_DEADLINE', true)} rounded-lg`}
            >
              <div className="text-xs font-bold text-amber-800 uppercase">Decisão</div>
              <div className="font-bold text-sm text-slate-800">DENTRO DO PRAZO?</div>
              <div className="text-[11px] text-slate-500">Política de reembolso (30 dias)</div>
            </div>

            <div className="text-rose-500 font-bold text-xs flex items-center gap-1">
              <span>NÃO/RECUSADO</span>
              <ArrowRight className="w-3 h-3" />
            </div>

            <div className="text-xs font-medium px-3 py-1.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
              Direto para Resultado: Reprovado
            </div>
          </div>

          <div className="text-slate-400">↓ SIM</div>

          {/* Duplicity check */}
          <div
            onClick={() => onSelectStep?.('CHECK_DUPLICATE')}
            className={`w-80 ${getNodeClass('CHECK_DUPLICATE')}`}
          >
            <div className="font-semibold text-sm">VERIFICAR DUPLICIDADE</div>
            <div className="text-xs text-slate-500">Hash de arquivo & chave fiscal única</div>
          </div>

          <div className="text-slate-400">↓</div>

          {/* Decision: Mesmo Arquivo Já Enviado? */}
          <div className="flex items-center gap-6 justify-center w-full">
            <div
              onClick={() => onSelectStep?.('DECISION_ALREADY_SUBMITTED')}
              className={`w-64 border-amber-300 ${getNodeClass('DECISION_ALREADY_SUBMITTED', true)} rounded-lg`}
            >
              <div className="text-xs font-bold text-amber-800 uppercase">Decisão</div>
              <div className="font-bold text-sm text-slate-800">MESMO ARQUIVO JÁ ENVIADO?</div>
            </div>

            <div className="text-rose-500 font-bold text-xs flex items-center gap-1">
              <span>SIM/RECUSADO</span>
              <ArrowRight className="w-3 h-3" />
            </div>

            <div className="text-xs font-medium px-3 py-1.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
              Reprovado (Documento já recebido)
            </div>
          </div>
        </div>

        {/* STAGE 2: QR CODE / CHAVE & FISCAL ROUTING */}
        <div className="w-full max-w-4xl p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Trilha Fiscal SEFAZ vs. Caminho Alternativo
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left Branch: Sem QR / Chave */}
            <div className="flex flex-col items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-600">NÃO</div>
              <div
                onClick={() => onSelectStep?.('NO_QR_KEY_ALTERNATIVE_PATH')}
                className={`w-full ${getNodeClass('NO_QR_KEY_ALTERNATIVE_PATH')}`}
              >
                <div className="font-bold text-sm text-slate-800">SEM QR / CHAVE</div>
                <div className="text-xs text-amber-700 font-medium">CAMINHO ALTERNATIVO</div>
                <div className="text-[11px] text-slate-500 mt-1">Encaminha direto ao Processamento IA</div>
              </div>
            </div>

            {/* Right Branch: Com QR / Chave */}
            <div className="flex flex-col items-center gap-3 p-4 bg-blue-50/40 rounded-xl border border-blue-100">
              <div className="text-xs font-bold text-blue-700">SIM</div>

              <div
                onClick={() => onSelectStep?.('READ_QR_OR_KEY')}
                className={`w-full ${getNodeClass('READ_QR_OR_KEY')}`}
              >
                <div className="font-bold text-sm text-slate-800">LEITURA QR / CHAVE</div>
                <div className="text-xs text-slate-500">Chave de acesso 44 dígitos / URL SEFAZ</div>
              </div>

              <div className="text-slate-400">↓</div>

              <div
                onClick={() => onSelectStep?.('FISCAL_VALIDATION')}
                className={`w-full ${getNodeClass('FISCAL_VALIDATION')}`}
              >
                <div className="font-bold text-sm text-slate-800">VALIDAÇÃO FISCAL</div>
                <div className="text-xs text-blue-700 font-medium">SEFAZ / Ambiente Autorizador</div>
                <div className="text-[11px] text-slate-500 mt-0.5">27 UFs brasileiras cobertas</div>
              </div>

              <div className="text-slate-400">↓</div>

              {/* Consulta Realizada? & Documento Válido? */}
              <div className="w-full flex flex-col gap-2">
                <div
                  onClick={() => onSelectStep?.('DECISION_FISCAL_QUERY_SUCCESS')}
                  className={`w-full ${getNodeClass('DECISION_FISCAL_QUERY_SUCCESS', true)} rounded-lg`}
                >
                  <div className="text-xs font-bold text-slate-800">CONSULTA REALIZADA?</div>
                  <div className="text-[11px] text-slate-500">NÃO → Exceção na Consulta (Notificar RH)</div>
                </div>

                <div
                  onClick={() => onSelectStep?.('DECISION_FISCAL_DOC_VALID')}
                  className={`w-full ${getNodeClass('DECISION_FISCAL_DOC_VALID', true)} rounded-lg`}
                >
                  <div className="text-xs font-bold text-slate-800">DOCUMENTO FISCAL VÁLIDO?</div>
                  <div className="text-[11px] text-slate-500">NÃO → Fiscal Inválido / Suspeita</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STAGE 3: AI PROCESSING & STRUCTURED DATA */}
        <div className="w-full max-w-2xl flex flex-col items-center gap-3">
          <div className="text-slate-400">↓ Convergência de Trilha</div>

          <div
            onClick={() => onSelectStep?.('AI_PROCESSING')}
            className={`w-80 ${getNodeClass('AI_PROCESSING')}`}
          >
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-700 mb-0.5">
              <Bot className="w-3.5 h-3.5" /> Gemini Multimodal OCR
            </div>
            <div className="font-bold text-sm text-slate-900">PROCESSAMENTO COM IA</div>
            <div className="text-xs text-slate-500">Extração de itens, impostos, CNPJ e valores</div>
          </div>

          <div className="text-slate-400">↓</div>

          <div
            onClick={() => onSelectStep?.('STRUCTURED_DATA')}
            className={`w-80 ${getNodeClass('STRUCTURED_DATA')}`}
          >
            <div className="font-bold text-sm text-slate-900">DADOS ESTRUTURADOS</div>
            <div className="text-xs text-slate-500">JSON normalizado com pontuação de precisão</div>
          </div>

          <div className="text-slate-400">↓</div>

          {/* Decision Grid: Dados Suficientes, Divergências Críticas, Confiança >= 98% */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
            <div
              onClick={() => onSelectStep?.('DECISION_DATA_SUFFICIENT')}
              className={`${getNodeClass('DECISION_DATA_SUFFICIENT', true)} rounded-xl`}
            >
              <div className="text-[11px] font-bold text-slate-500 uppercase">Validação 1</div>
              <div className="font-bold text-xs text-slate-900 mt-0.5">DADOS SUFICIENTES?</div>
              <div className="text-[10px] text-slate-500 mt-1">NÃO → Análise Humana</div>
            </div>

            <div
              onClick={() => onSelectStep?.('DECISION_CRITICAL_DISCREPANCIES')}
              className={`${getNodeClass('DECISION_CRITICAL_DISCREPANCIES', true)} rounded-xl`}
            >
              <div className="text-[11px] font-bold text-slate-500 uppercase">Validação 2</div>
              <div className="font-bold text-xs text-slate-900 mt-0.5">DIVERGÊNCIAS CRÍTICAS?</div>
              <div className="text-[10px] text-slate-500 mt-1">Ex: CPF não confere</div>
            </div>

            <div
              onClick={() => onSelectStep?.('DECISION_AI_CONFIDENCE_98')}
              className={`${getNodeClass('DECISION_AI_CONFIDENCE_98', true)} rounded-xl`}
            >
              <div className="text-[11px] font-bold text-slate-500 uppercase">Validação 3</div>
              <div className="font-bold text-xs text-slate-900 mt-0.5">IA SEGURA DA LEITURA?</div>
              <div className="text-[10px] text-slate-700 font-bold mt-1">SIM • ≥ 98%</div>
            </div>
          </div>
        </div>

        {/* STAGE 4: REIMBURSEMENT RULES & ELIGIBILITY */}
        <div className="w-full max-w-2xl flex flex-col items-center gap-3">
          <div className="text-slate-400">↓ Todos os critérios atendidos (SIM)</div>

          <div
            onClick={() => onSelectStep?.('REGRAS DE REEMBOLSO' as any)}
            className={`w-80 ${getNodeClass('REIMBURSEMENT_RULES')}`}
          >
            <div className="font-bold text-sm text-slate-900">REGRAS DE REEMBOLSO</div>
            <div className="text-xs text-slate-500">Categorias permitidas, limites e itens vedados</div>
          </div>

          <div className="text-slate-400">↓</div>

          <div
            onClick={() => onSelectStep?.('CALCULATE_ELIGIBLE_AMOUNT')}
            className={`w-80 ${getNodeClass('CALCULATE_ELIGIBLE_AMOUNT')}`}
          >
            <div className="font-bold text-sm text-slate-900">CALCULAR VALOR ELEGÍVEL</div>
            <div className="text-xs text-slate-500 flex justify-center gap-3 mt-1">
              <span className="text-emerald-700 font-semibold">INTEGRAL</span>
              <span>•</span>
              <span className="text-blue-700 font-semibold">PARCIAL</span>
              <span>•</span>
              <span className="text-rose-700 font-semibold">REPROVADO (0)</span>
            </div>
          </div>

          <div className="text-slate-400">↓</div>

          <div
            onClick={() => onSelectStep?.('DECISION_FRAUD_SUSPICION')}
            className={`w-80 ${getNodeClass('DECISION_FRAUD_SUSPICION', true)} rounded-xl`}
          >
            <div className="text-xs font-bold text-amber-800 uppercase">Validação Antifraude</div>
            <div className="font-bold text-sm text-slate-900">SUSPEITA RELEVANTE DE FRAUDE?</div>
            <div className="text-xs text-slate-500 mt-0.5">SIM → Análise Humana | NÃO → Decisão Auto</div>
          </div>

          <div className="text-slate-400">↓ NÃO</div>

          <div
            onClick={() => onSelectStep?.('AUTOMATIC_DECISION')}
            className={`w-80 ${getNodeClass('AUTOMATIC_DECISION')}`}
          >
            <div className="flex items-center justify-center gap-1 text-xs font-bold text-emerald-800 mb-0.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Aprovação Automática
            </div>
            <div className="font-bold text-sm text-slate-900">DECISÃO AUTOMÁTICA</div>
            <div className="text-xs text-slate-500">Aprovação integral ou parcial do valor elegível</div>
          </div>
        </div>

        {/* STAGE 5: HUMAN REVIEW BOX & FINAL OUTCOME */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
          {/* Box Análise Humana */}
          <div
            onClick={() => onSelectStep?.('HUMAN_ANALYSIS')}
            className={`p-5 rounded-2xl ${getNodeClass('HUMAN_ANALYSIS')}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="w-5 h-5 text-amber-600" />
              <div className="font-bold text-base text-slate-900">ANÁLISE HUMANA</div>
            </div>
            <div className="text-xs text-slate-600 leading-relaxed mb-3">
              Gatilhos de encaminhamento:
            </div>
            <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
              <li>Dados insuficientes</li>
              <li>Suspeita de fraude</li>
              <li>Baixa confiança (&lt; 98%)</li>
              <li>Divergência (CPF não confere ou valor)</li>
              <li>Fiscal inconclusivo / exceção SEFAZ</li>
              <li>Critérios não atendidos</li>
            </ul>
            <div className="mt-4 pt-3 border-t border-amber-200 text-xs font-semibold text-amber-900">
              Ação: Decidir valor elegível e motivo → Resultado
            </div>
          </div>

          {/* Box Resultado / Status */}
          <div
            onClick={() => onSelectStep?.('RESULT_STATUS')}
            className={`p-5 rounded-2xl ${getNodeClass('RESULT_STATUS')}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              <div className="font-bold text-base text-slate-900">RESULTADO / STATUS</div>
            </div>
            <div className="text-xs text-slate-600 mb-3">
              Estados finais padronizados do Bluepay:
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-xs">
                Aprovado
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-xs">
                Aprovado parcialmente
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-xs">
                Reprovado
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-xs">
                Novo envio
              </span>
            </div>
            <div className="text-xs text-slate-500 space-y-1">
              <div>• Valor comprovado: R$ X</div>
              <div>• Valor elegível: R$ Y</div>
              <div>• Motivo + registro em livro fiscal</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
