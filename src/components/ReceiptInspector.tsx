import React from 'react';
import { FinalResult, StructuredReceiptData } from '../types/bluepay';
import { Check, X, ShieldAlert, Sparkles, Building, Calendar, CreditCard, Tag, FileCheck } from 'lucide-react';

interface ReceiptInspectorProps {
  result: FinalResult;
  previewImage?: string;
  onTriggerHumanReview?: () => void;
}

export const ReceiptInspector: React.FC<ReceiptInspectorProps> = ({
  result,
  previewImage,
  onTriggerHumanReview,
}) => {
  const data: StructuredReceiptData | undefined = result.structuredData;

  const getStatusBadge = () => {
    switch (result.status) {
      case 'Aprovado':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Aprovado parcialmente':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Reprovado':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Novo envio solicitado':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Em análise humana':
        return 'bg-purple-100 text-purple-800 border-purple-300 animate-pulse';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Top Banner: Status, Proven vs Eligible */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Protocolo #{result.submissionId}
          </span>
          <div className="flex items-center gap-2.5 mt-1">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge()}`}>
              {result.status}
            </span>
            <span className="text-xs text-slate-500">
              Solicitante: <strong className="text-slate-800">{result.employeeName}</strong> ({result.employeeCpf})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-slate-500">Valor Comprovado</div>
            <div className="text-lg font-bold text-slate-900">
              R$ {result.provenAmount.toFixed(2)}
            </div>
          </div>
          <div className="h-8 w-px bg-slate-300" />
          <div className="text-right">
            <div className="text-xs text-slate-500">Valor Elegível</div>
            <div className="text-xl font-extrabold text-blue-600">
              R$ {result.eligibleAmount.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Decision Reason & Action Trigger */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Motivo + Registro de Auditoria
        </div>
        <p className="text-sm text-slate-700 leading-relaxed font-medium">
          {result.reason}
        </p>

        {result.humanReviewRequired && onTriggerHumanReview && (
          <div className="pt-3 border-t border-purple-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-purple-700 font-semibold">
              <ShieldAlert className="w-4 h-4" />
              Documento retido para análise humana.
            </div>
            <button
              onClick={onTriggerHumanReview}
              className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs"
            >
              Abrir Análise Humana
            </button>
          </div>
        )}

        {result.humanReviewDecision && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-700" />
              Parecer emitido por {result.humanReviewDecision.reviewerName}
            </div>
            <div>Decisão: <strong>{result.humanReviewDecision.action}</strong> • Valor final: <strong>R$ {result.humanReviewDecision.overrideEligibleAmount.toFixed(2)}</strong></div>
            <div className="text-slate-600 italic">"{result.humanReviewDecision.justification}"</div>
          </div>
        )}
      </div>

      {/* Structured OCR Data Extraction */}
      {data ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Dados Estruturados Extraídos (OCR & SEFAZ)
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500">Confiança IA:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded ${
                  data.confidenceScore >= 98
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {data.confidenceScore.toFixed(1)}% {data.confidenceScore >= 98 ? '✓' : '(< 98%)'}
              </span>
            </div>
          </div>

          {previewImage && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center gap-4">
              <img
                src={previewImage}
                alt="Comprovante enviado"
                className="max-h-48 max-w-xs object-contain rounded-lg border border-slate-300 shadow-xs bg-white"
              />
              <div className="text-xs space-y-1 text-slate-600">
                <span className="font-bold text-slate-900 block">Comprovante Digitalizado Enviado</span>
                <div>Imagem analisada pelo modelo multimodal Gemini Vision.</div>
                <div className="text-[11px] text-slate-500">
                  Estabelecimento detectado: <strong>{data.issuerName}</strong>
                </div>
                {data.accessKey && (
                  <div className="text-[11px] font-mono text-slate-600 break-all">
                    Chave: {data.accessKey}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Building className="w-3.5 h-3.5" /> Estabelecimento
              </span>
              <div className="font-semibold text-slate-900 mt-1">{data.issuerName}</div>
              <div className="text-slate-500 mt-0.5">CNPJ: {data.issuerCnpj || 'Não informado'}</div>
              {data.issuerState && (
                <div className="text-slate-500">UF SEFAZ: {data.issuerState}</div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Emissão & Tipo
              </span>
              <div className="font-semibold text-slate-900 mt-1">
                {data.emissionDate ? new Date(data.emissionDate).toLocaleString('pt-BR') : 'N/A'}
              </div>
              <div className="text-slate-500 mt-0.5">
                Modelo: {data.documentType} {data.documentNumber ? `nº ${data.documentNumber}` : ''}
              </div>
              {data.isTestEnvironment && (
                <div className="text-rose-600 font-bold mt-0.5">
                  ⚠️ AMBIENTE DE HOMOLOGAÇÃO / SEM VALOR
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" /> Pagamento & Consumidor
              </span>
              <div className="font-semibold text-slate-900 mt-1">
                {data.paymentMethod || 'Não identificado'}
              </div>
              <div className="text-slate-500 mt-0.5">
                CPF no Cupom: {data.consumerCpf || 'Não identificado'}
              </div>
              {data.authorizationProtocol && (
                <div className="text-slate-500 truncate">Prot: {data.authorizationProtocol}</div>
              )}
            </div>
          </div>

          {/* Access Key */}
          {data.accessKey && (
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700 break-all">
              <span className="font-bold text-slate-500 select-none mr-2">Chave de Acesso:</span>
              {data.accessKey}
            </div>
          )}

          {/* Itemized Table */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Itens Comprovados ({data.items.length})
            </span>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Descrição</th>
                    <th className="p-2.5 text-center">Qtde</th>
                    <th className="p-2.5 text-right">Unitário</th>
                    <th className="p-2.5 text-right">Total</th>
                    <th className="p-2.5 text-center">Elegibilidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((item, idx) => (
                    <tr key={idx} className={item.eligible ? 'bg-white' : 'bg-rose-50/50'}>
                      <td className="p-2.5 font-medium text-slate-900">
                        {item.description}
                        {item.ineligibilityReason && (
                          <div className="text-[11px] text-rose-600 font-normal mt-0.5">
                            {item.ineligibilityReason}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 text-center text-slate-600">
                        {item.quantity} {item.unit || 'UN'}
                      </td>
                      <td className="p-2.5 text-right text-slate-600">
                        R$ {item.unitPrice.toFixed(2)}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        R$ {item.totalPrice.toFixed(2)}
                      </td>
                      <td className="p-2.5 text-center">
                        {item.eligible ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                            <Check className="w-3 h-3" /> Elegível
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
                            <X className="w-3 h-3" /> Inelegível
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
          Dados estruturados não gerados (fluxo interrompido nas etapas preliminares de qualidade, prazo ou duplicidade).
        </div>
      )}
    </div>
  );
};
