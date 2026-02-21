import { CheckCircle2, Clock, Lock, CreditCard } from "lucide-react";
import type { Statement } from "../services/credit-card.service";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StatementItemProps {
  statement: Statement;
  onSelect?: (s: Statement) => void;
}

const statusConfig = {
  OPEN: { label: "Aberta", color: "text-emerald-500", bg: "bg-emerald-50", icon: Clock },
  CLOSED: { label: "Fechada", color: "text-amber-500", bg: "bg-amber-50", icon: Lock },
  PAID: { label: "Paga", color: "text-blue-500", bg: "bg-blue-50", icon: CheckCircle2 },
  PARTIALLY_PAID: { label: "Parcial", color: "text-indigo-500", bg: "bg-indigo-50", icon: CheckCircle2 },
};

export function StatementItem({ statement, onSelect }: StatementItemProps) {
  const config = statusConfig[statement.status];
  const Icon = config.icon;

  return (
    <div 
      onClick={() => onSelect?.(statement)}
      className="group flex items-center justify-between p-5 bg-white rounded-2xl border border-zinc-100 hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${config.bg} ${config.color} transition-transform group-hover:scale-110`}>
          <Icon size={20} />
        </div>
        <div>
          <h4 className="font-bold text-zinc-900 capitalize">
            {format(new Date(statement.dueDate), "MMMM yyyy", { locale: ptBR })}
          </h4>
          <span className={`text-[10px] font-black uppercase tracking-widest ${config.color}`}>
            {config.label}
          </span>
        </div>
      </div>

      <div className="text-right">
        <p className="text-xs text-zinc-400 font-medium mb-0.5">Vencimento: {format(new Date(statement.dueDate), "dd/MM")}</p>
        <h4 className="text-lg font-black text-zinc-900 tracking-tight">
          R$ {statement.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </h4>
      </div>
    </div>
  );
}
