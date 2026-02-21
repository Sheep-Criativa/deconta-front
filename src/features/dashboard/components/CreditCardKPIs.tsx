import { ArrowUpCircle, Calendar, ShieldCheck, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

interface KPIProps {
  label: string;
  value: number | string;
  icon: any;
  color: string;
  description?: string;
}

function KPICard({ label, value, icon: Icon, color, description }: KPIProps) {
  return (
    <Card className="p-6 border-none shadow-sm flex items-center gap-4 bg-white rounded-2xl relative overflow-hidden group">
        <div className={`p-4 rounded-2xl ${color} bg-opacity-10 transition-transform group-hover:scale-110 duration-300`}>
            <Icon size={24} className={color.replace('bg-', 'text-')} />
        </div>
        <div>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{label}</p>
            <h3 className="text-2xl font-black text-zinc-900 tracking-tighter mt-0.5">
                {typeof value === 'number' ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : value}
            </h3>
            {description && <p className="text-[10px] text-zinc-400 mt-1 font-medium">{description}</p>}
        </div>
    </Card>
  );
}

interface CreditCardKPIsProps {
  currentStatement: number;
  availableLimit: number;
  totalLimit: number;
  nextDueDate?: string;
}

export function CreditCardKPIs({ currentStatement, availableLimit, totalLimit, nextDueDate }: CreditCardKPIsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <KPICard 
        label="Fatura Atual" 
        value={currentStatement} 
        icon={AlertCircle} 
        color="bg-rose-500" 
        description="Valor acumulado no ciclo atual"
      />
      <KPICard 
        label="Disponível" 
        value={availableLimit} 
        icon={ShieldCheck} 
        color="bg-emerald-500" 
        description={`De um total de R$ ${totalLimit.toLocaleString('pt-BR')}`}
      />
      <KPICard 
        label="Vencimento" 
        value={nextDueDate || "-- / --"} 
        icon={Calendar} 
        color="bg-blue-500" 
        description="Próxima data de pagamento"
      />
    </div>
  );
}
