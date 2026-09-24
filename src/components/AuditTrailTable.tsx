import React, { useState } from 'react';
import { FinalResult, FinalStatusType } from '../types/bluepay';
import { Search, Filter, ChevronRight, Eye, Calendar, User, DollarSign } from 'lucide-react';

interface AuditTrailTableProps {
  records: FinalResult[];
  onSelectRecord: (record: FinalResult) => void;
  onOpenReview: (record: FinalResult) => void;
}

export const AuditTrailTable: React.FC<AuditTrailTableProps> = ({
  records,
  onSelectRecord,
  onOpenReview,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filtered = records.filter((r) => {
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    const matchesSearch =
      r.submissionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.employeeCpf.includes(searchQuery) ||
      r.reason.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: FinalStatusType) => {
    switch (status) {
      case 'Aprovado':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Aprovado parcialmente':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Reprovado':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Novo envio solicitado':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Em análise humana':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Livro de Auditoria & Histórico de Processamento
          </h3>
          <p className="text-xs text-slate-500">
            Registros imutáveis com trilha cronológica de execução dos 22 passos do fluxo Bluepay
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar colaborador, CPF ou ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter dropdown */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white"
          >
            <option value="ALL">Todos os Status</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Aprovado parcialmente">Aprovado parcialmente</option>
            <option value="Em análise humana">Em análise humana</option>
            <option value="Reprovado">Reprovado</option>
            <option value="Novo envio solicitado">Novo envio solicitado</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
          Nenhum comprovante encontrado para os critérios selecionados.
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Protocolo</th>
                <th className="p-3">Colaborador</th>
                <th className="p-3">Comprovado</th>
                <th className="p-3">Elegível</th>
                <th className="p-3">Status Final</th>
                <th className="p-3">Data / Hora</th>
                <th className="p-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.submissionId} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-mono font-bold text-slate-700">
                    {item.submissionId}
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-900">{item.employeeName}</div>
                    <div className="text-[11px] text-slate-500">{item.employeeCpf}</div>
                  </td>
                  <td className="p-3 text-slate-700 font-medium">
                    R$ {item.provenAmount.toFixed(2)}
                  </td>
                  <td className="p-3 font-bold text-blue-600">
                    R$ {item.eligibleAmount.toFixed(2)}
                  </td>
                  <td className="p-3">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">
                    {new Date(item.processedAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSelectRecord(item)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                        title="Ver detalhes da auditoria"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {item.humanReviewRequired && (
                        <button
                          onClick={() => onOpenReview(item)}
                          className="px-2 py-1 text-[11px] font-bold bg-purple-600 hover:bg-purple-700 text-white rounded transition shadow-xs"
                        >
                          Auditar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
