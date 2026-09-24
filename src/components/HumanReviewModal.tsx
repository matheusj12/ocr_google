import React, { useState } from 'react';
import { FinalResult } from '../types/bluepay';
import { UserCheck, ShieldAlert, CheckCircle2, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';

interface HumanReviewModalProps {
  submission: FinalResult;
  onClose: () => void;
  onResolve: (decision: {
    submissionId: string;
    action: 'APPROVE_INTEGRAL' | 'APPROVE_PARTIAL' | 'REJECT' | 'REQUEST_RESUBMIT';
    overrideEligibleAmount: number;
    justification: string;
    reviewerName: string;
  }) => Promise<void>;
}

export const HumanReviewModal: React.FC<HumanReviewModalProps> = ({
  submission,
  onClose,
  onResolve,
}) => {
  const [action, setAction] = useState<'APPROVE_INTEGRAL' | 'APPROVE_PARTIAL' | 'REJECT' | 'REQUEST_RESUBMIT'>('APPROVE_PARTIAL');
  const [overrideAmount, setOverrideAmount] = useState<number>(submission.eligibleAmount || submission.provenAmount || 0);
  const [justification, setJustification] = useState<string>('');
  const [reviewerName, setReviewerName] = useState<string>('Auditor Fiscal Bluepay');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification.trim()) {
      alert('Por favor, informe a justificativa da decisão de auditoria.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onResolve({
        submissionId: submission.submissionId,
        action,
        overrideEligibleAmount: Number(overrideAmount),
        justification,
        reviewerName,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-200">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Mesa de Decisão Manual
              </span>
              <h3 className="text-lg font-bold text-slate-900">
                Análise Humana de Reembolso
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* Flagged Issue Alert */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            Gatilho de Auditoria Acionado:
          </div>
          <p className="leading-relaxed">{submission.reason}</p>
        </div>

        {/* Metadata summary */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-500">Colaborador:</span>
            <div className="font-bold text-slate-900">{submission.employeeName}</div>
            <div className="text-slate-500">CPF: {submission.employeeCpf}</div>
          </div>
          <div>
            <span className="text-slate-500">Valor Comprovado no Recibo:</span>
            <div className="font-bold text-slate-900 text-sm">
              R$ {submission.provenAmount.toFixed(2)}
            </div>
            <div className="text-slate-500">Protocolo: {submission.submissionId}</div>
          </div>
        </div>

        {/* Auditor Decision Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Decidir Ação do Reembolso
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAction('APPROVE_INTEGRAL');
                  setOverrideAmount(submission.provenAmount);
                }}
                className={`p-2.5 rounded-xl border font-bold text-left transition ${
                  action === 'APPROVE_INTEGRAL'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Aprovação Integral
                </div>
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                  Aprovar total R$ {submission.provenAmount.toFixed(2)}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAction('APPROVE_PARTIAL')}
                className={`p-2.5 rounded-xl border font-bold text-left transition ${
                  action === 'APPROVE_PARTIAL'
                    ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-200'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Aprovação Parcial
                </div>
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                  Definir valor elegível ajustado
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAction('REJECT');
                  setOverrideAmount(0);
                }}
                className={`p-2.5 rounded-xl border font-bold text-left transition ${
                  action === 'REJECT'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-200'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Reprovar Pedido
                </div>
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                  Rejeição com justificativa
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAction('REQUEST_RESUBMIT');
                  setOverrideAmount(0);
                }}
                className={`p-2.5 rounded-xl border font-bold text-left transition ${
                  action === 'REQUEST_RESUBMIT'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-200'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-amber-600" />
                  Solicitar Novo Envio
                </div>
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                  Pedir comprovação adicional
                </div>
              </button>
            </div>
          </div>

          {(action === 'APPROVE_PARTIAL' || action === 'APPROVE_INTEGRAL') && (
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wide">
                Valor Elegível a Reembolsar (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={submission.provenAmount}
                  value={overrideAmount}
                  onChange={(e) => setOverrideAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Motivo / Justificativa da Decisão (Registro Formal)
            </label>
            <textarea
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Ex: Documento homologado manualmente após conferência de extrato bancário ou exclusão de despesa não elegível."
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-500 mb-1">
              Nome do Auditor Responsável
            </label>
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Registrando...
                </>
              ) : (
                'Confirmar Decisão e Gravar Status'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
