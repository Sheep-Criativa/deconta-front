import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type Transaction } from "../services/transaction.service";
import { type Account } from "../services/account.service";
import { type Category } from "../services/category.service";
import { type Responsible } from "../services/responsible.service";
import { ArrowDownCircle, ArrowUpCircle, CreditCard, Landmark, Pencil, Tag, User, AlignLeft, Calendar, Info } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ViewTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  accounts: Account[];
  categories: Category[];
  responsibles: Responsible[];
  onEditToggle: () => void;
}

export function ViewTransactionDialog({
  open,
  onOpenChange,
  transaction,
  accounts,
  categories,
  responsibles,
  onEditToggle,
}: ViewTransactionDialogProps) {
  if (!transaction) return null;

  const isExpense = transaction.type.trim() === "EXPENSE";
  const account = accounts.find((a) => a.id === transaction.accountId);
  const category = categories.find((c) => c.id === transaction.categoryId);
  const resp = responsibles.find((r) => r.id === transaction.responsibleId);

  const statusLabel: Record<string, string> = {
    CONFIRMED: "Confirmado",
    PENDING: "Pendente",
    RECONCILED: "Conciliado",
  };
  
  const statusBadge: Record<string, string> = {
    CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    RECONCILED: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] bg-white rounded-t-3xl sm:rounded-3xl border-none shadow-2xl p-6">
        <DialogHeader className="mb-4">
          <div className="flex justify-between items-start">
            <DialogTitle className="text-xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
              Detalhes da Transação
            </DialogTitle>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusBadge[transaction.status.trim()] ?? "bg-zinc-100 text-zinc-500"}`}>
              {statusLabel[transaction.status.trim()] ?? transaction.status.trim()}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Amount and Title header */}
          <div className={`p-5 rounded-2xl border flex flex-col items-center justify-center text-center ${isExpense ? "bg-rose-50 border-rose-100" : "bg-emerald-50 border-emerald-100"}`}>
            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 mb-1">
              {isExpense ? "Despesa" : "Receita"}
            </span>
            <span className={`text-4xl font-black tabular-nums tracking-tighter ${isExpense ? "text-rose-600" : "text-emerald-600"}`}>
               {isExpense ? "-" : "+"} R$ {Number(transaction.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-base font-bold text-zinc-800 mt-2 line-clamp-2 px-4 shadow-sm border border-zinc-200 bg-white rounded-lg py-1">
               {transaction.description || (isExpense ? "Despesa" : "Receita")}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div className="bg-zinc-50 border border-zinc-100 p-3 rounded-xl flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-zinc-200/50 flex items-center justify-center text-zinc-500 shrink-0">
                  <Landmark size={14} />
               </div>
               <div className="flex flex-col min-w-0">
                 <span className="text-[10px] font-black uppercase text-zinc-400">Conta</span>
                 <span className="text-sm font-bold text-zinc-700 truncate">{account?.name || "Desconhecida"}</span>
               </div>
             </div>
             
             <div className="bg-zinc-50 border border-zinc-100 p-3 rounded-xl flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-zinc-200/50 flex items-center justify-center shrink-0" style={{ color: category?.color || "#71717a" }}>
                  <Tag size={14} />
               </div>
               <div className="flex flex-col min-w-0">
                 <span className="text-[10px] font-black uppercase text-zinc-400">Categoria</span>
                 <span className="text-sm font-bold text-zinc-700 truncate">{category?.name || "Sem categoria"}</span>
               </div>
             </div>
             
             <div className="bg-zinc-50 border border-zinc-100 p-3 rounded-xl flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-zinc-200/50 flex items-center justify-center shrink-0" style={{ color: resp?.color || "#71717a" }}>
                  <User size={14} />
               </div>
               <div className="flex flex-col min-w-0">
                 <span className="text-[10px] font-black uppercase text-zinc-400">Responsável</span>
                 <span className="text-sm font-bold text-zinc-700 truncate">{resp?.name || "Sem responsável"}</span>
               </div>
             </div>
             
             <div className="bg-zinc-50 border border-zinc-100 p-3 rounded-xl flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-zinc-200/50 flex items-center justify-center text-zinc-500 shrink-0">
                  <Calendar size={14} />
               </div>
               <div className="flex flex-col min-w-0">
                 <span className="text-[10px] font-black uppercase text-zinc-400">Vencimento</span>
                 <span className="text-sm font-bold text-zinc-700 truncate">{format(parseISO(transaction.date), "dd/MM/yyyy")}</span>
               </div>
             </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-100 p-3 rounded-xl flex flex-col gap-1">
             <span className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-1"><AlignLeft size={10} /> Observações / Comentários</span>
             <p className="text-sm font-medium text-zinc-600 mt-1 whitespace-pre-wrap">
               {transaction.notes || "Nenhum comentário anotado."}
             </p>
          </div>
          
          <Button
            onClick={() => {
              onOpenChange(false);
              onEditToggle();
            }}
            className="w-full h-12 rounded-xl font-black text-sm bg-zinc-900 hover:bg-zinc-800 text-white shadow-lg flex items-center gap-2"
          >
            <Pencil size={15} /> Editar Transação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
