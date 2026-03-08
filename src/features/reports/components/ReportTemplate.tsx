import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { GetSummaryResponse } from "../services/reports.service";

interface ReportTemplateProps {
  reportDateRange: string;
  groupBy: "none" | "category" | "responsible" | "account";
  layoutMode?: "COMPLETE" | "SIMPLE";
  summaryData?: GetSummaryResponse;
  listData?: any[];
  userFullName?: string;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

export const ReportTemplate = React.forwardRef<HTMLDivElement, ReportTemplateProps>(
  ({ reportDateRange, groupBy, summaryData, listData, layoutMode = "COMPLETE", userFullName }, ref) => {
    
    return (
      <div 
        ref={ref} 
        className="w-full bg-white text-zinc-900 font-sans mx-auto"
        // Estilos essenciais para a impressão em PDF:
        style={{ padding: "40px", width: "800px", minHeight: "1120px", position: 'relative' }}
      >
        {/* Header do Relatório */}
        <div className="flex justify-between items-end border-b-2 border-zinc-200 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-emerald-600 tracking-tight leading-none mb-2">Relatório Financeiro</h1>
            <p className="text-sm font-medium text-zinc-500">Deconta - Gestão Inteligente</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-zinc-800">{reportDateRange || "Período Geral"}</p>
            <p className="text-xs font-medium text-zinc-400 mt-1">Gerado em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            {userFullName && <p className="text-xs font-medium text-zinc-400">Por: {userFullName}</p>}
          </div>
        </div>

        {/* Resumo Key Metrics */}
        {summaryData && layoutMode === "COMPLETE" && (
          <div className="grid grid-cols-3 gap-6 mb-10">
            <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-100">
              <p className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-1">Total de Entradas</p>
              <p className="text-2xl font-black text-emerald-600">{formatCurrency(summaryData.totalIncome)}</p>
            </div>
            <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-100">
              <p className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-1">Total de Saídas</p>
              <p className="text-2xl font-black text-rose-500">{formatCurrency(summaryData.totalExpense)}</p>
            </div>
            <div className={`rounded-2xl p-5 border ${summaryData.netBalance >= 0 ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100"}`}>
              <p className="text-xs font-black uppercase tracking-widest mb-1 opacity-70">Saldo Final</p>
              <p className={`text-2xl font-black ${summaryData.netBalance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {formatCurrency(summaryData.netBalance)}
              </p>
            </div>
          </div>
        )}

        {summaryData && layoutMode === "SIMPLE" && (
          <div className="mb-8 p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex justify-between items-center">
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Total Consolidado</p>
            <p className={`text-3xl font-black ${summaryData.netBalance >= 0 ? "text-zinc-800" : "text-rose-600"}`}>
              {formatCurrency(summaryData.totalIncome > 0 && summaryData.totalExpense === 0 ? summaryData.totalIncome : summaryData.totalExpense > 0 && summaryData.totalIncome === 0 ? summaryData.totalExpense : Math.abs(summaryData.netBalance))}
            </p>
          </div>
        )}

        {/* Listagens Agrupadas (se hover groupBy) OU Listagem Detalhada */}
        {listData && listData.length > 0 && (
          <div className="mb-10">
            <h3 className="text-lg font-black text-zinc-800 border-b border-zinc-200 pb-2 mb-4">
              {groupBy === "none" ? "Extrato Detalhado" : groupBy === "category" ? "Despesas por Categoria" : groupBy === "responsible" ? "Despesas por Responsável" : "Resumo por Conta"}
            </h3>
            
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  {groupBy === "none" ? (
                    <>
                      <th className="py-3 px-4 bg-zinc-100 text-xs font-bold uppercase tracking-widest text-zinc-500 rounded-tl-xl w-[20%]">Data</th>
                      <th className="py-3 px-4 bg-zinc-100 text-xs font-bold uppercase tracking-widest text-zinc-500 w-[35%]">Descrição</th>
                      <th className="py-3 px-4 bg-zinc-100 text-xs font-bold uppercase tracking-widest text-zinc-500 w-[25%]">Categoria/Ref.</th>
                      <th className="py-3 px-4 bg-zinc-100 text-right text-xs font-bold uppercase tracking-widest text-zinc-500 rounded-tr-xl w-[20%]">Valor</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3 px-4 bg-zinc-100 text-xs font-bold uppercase tracking-widest text-zinc-500 rounded-tl-xl hidden">ID</th>
                      <th className="py-3 px-4 bg-zinc-100 text-xs font-bold uppercase tracking-widest text-zinc-500 rounded-tl-xl">
                        {groupBy === "category" ? "Categoria" : groupBy === "responsible" ? "Responsável" : "Conta"}
                      </th>
                      <th className="py-3 px-4 bg-zinc-100 text-right text-xs font-bold uppercase tracking-widest text-zinc-500">Transações</th>
                      <th className="py-3 px-4 bg-zinc-100 text-right text-xs font-bold uppercase tracking-widest text-zinc-500 rounded-tr-xl">Valor Total</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {listData.map((row, index) => {
                  if (groupBy === "none") {
                    return (
                      <tr key={index} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                        <td className="py-3 px-4 text-sm font-semibold text-zinc-600">
                          {new Date(row.date).toLocaleDateString("pt-BR", { timeZone: 'UTC' })}
                        </td>
                        <td className="py-3 px-4 text-sm font-bold text-zinc-800 truncate max-w-[200px]" title={row.description}>
                          {row.description}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-zinc-500">{row.categoryName}</td>
                        <td className={`py-3 px-4 text-sm font-black text-right ${row.type === 'EXPENSE' ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    );
                  }

                  // Agrupado
                  const label = row.categoryName || row.responsibleName || row.accountName || "N/A";
                  return (
                    <tr key={index} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                      <td className="py-3 px-4 text-sm font-semibold text-zinc-800">{label}</td>
                      <td className="py-3 px-4 text-sm font-medium text-zinc-500 text-right">{row.count}</td>
                      <td className="py-3 px-4 text-sm font-bold text-zinc-900 text-right">{formatCurrency(row.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {listData && listData.length === 0 && (
          <div className="py-10 text-center text-zinc-400 font-medium">
            Nenhum dado encontrado para os filtros selecionados.
          </div>
        )}

        {/* Footer info (Watermark) */}
        <div className="absolute bottom-10 left-10 right-10 text-center border-t border-zinc-200 pt-6">
          <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
            DECONTA - DOCUMENTO GERADO ELETRONICAMENTE - USO INTERNO
          </p>
        </div>
      </div>
    );
  }
);
