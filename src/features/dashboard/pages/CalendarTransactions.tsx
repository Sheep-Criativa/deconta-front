import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, addMonths, subMonths, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getTransactions, updateTransaction, type Transaction } from "../services/transaction.service";
import { getAccounts, type Account } from "../services/account.service";
import { getCategories, type Category } from "../services/category.service";
import { getResponsibles, type Responsible } from "../services/responsible.service";
import { CreateTransactionDialog } from "../components/CreateTransactionDialog";
import { ViewTransactionDialog } from "../components/ViewTransactionDialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CalendarTransactions() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Para exibir modal de visualização/edição se desejar depois, por enquanto abre Create/Edit dialog:
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [viewTx, setViewTx] = useState<Transaction | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);

  const loadAll = async () => {
    if (!user) return;
    try {
      const [txs, accs, cats, resps] = await Promise.all([
        getTransactions(user.id),
        getAccounts(user.id),
        getCategories(user.id),
        getResponsibles(user.id)
      ]);
      setTransactions(txs);
      setAccounts(accs);
      setCategories(cats);
      setResponsibles(resps);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar transações.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [user]);

  // Constantes de data
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const dateFormat = "d";

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  // Função para antecipar transação futura
  const handleMarkAsPaidToday = async (tx: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Cria a nota local e o objeto parcial
      const today = new Date();
      const newDesc = tx.description ? `${tx.description} - (Antecipado)` : "Pagamento (Antecipado)";
      console.log(`Antecipando: Status CONFIRMED, Data pagamento Hoje, Comment: ${newDesc}`);
      
      await updateTransaction(tx.id, {
        status: "CONFIRMED",
        paymentDate: today,
        description: newDesc,
      });
      toast.success("Pagamento antecipado marcado!");
      loadAll();
    } catch (err) {
      toast.error("Erro ao antecipar.");
    }
  };

  const openCreateForDate = (date: Date) => {
    setSelectedDate(date);
    setIsCreateOpen(true);
  };

  const renderCells = () => {
    return days.map((day) => {
      // Filtrar as txs desse dia baseadas no campo `date` ou `paymentDate`.
      // Vamos basear na Data de Vencimento (`date`) para exibir no calendário onde a pessoa previu a conta.
      const dayTxs = transactions.filter(tx => isSameDay(parseISO(tx.date), day));
      const incomeTxs = dayTxs.filter(t => t.type === "INCOME");
      const expenseTxs = dayTxs.filter(t => t.type === "EXPENSE");
      const isCurrentMonth = isSameMonth(day, monthStart);

      return (
        <div
          key={day.toString()}
          onClick={() => openCreateForDate(day)}
          className={`min-h-[120px] p-2 border border-zinc-100 transition-colors cursor-pointer relative group flex flex-col gap-1
            ${!isCurrentMonth ? "bg-zinc-50/50 text-zinc-400" : "bg-white hover:bg-zinc-50"}
            ${isToday(day) ? "ring-2 ring-inset ring-emerald-500 rounded-xl" : "rounded-xl"}
          `}
        >
          <div className="flex justify-between items-center mb-1">
            <span className={`text-sm font-bold ${isToday(day) ? "text-emerald-600" : "text-zinc-600"}`}>
              {format(day, dateFormat)}
            </span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Plus size={14} className="text-zinc-400" />
            </div>
          </div>
          
          <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1 max-h-[80px]">
             {dayTxs.map(tx => {
               const isExpense = tx.type === "EXPENSE";
               const isFuture = parseISO(tx.date) > new Date() && tx.status === "PENDING";
               
               return (
                 <div
                   key={tx.id}
                   onClick={(e) => { e.stopPropagation(); setViewTx(tx); }}
                   className={`text-[10px] sm:text-xs font-semibold px-2 py-1 rounded w-full truncate border
                    ${isExpense ? "bg-rose-50 border-rose-100 text-rose-700" : "bg-emerald-50 border-emerald-100 text-emerald-700"}
                    hover:brightness-95 transition-all flex justify-between items-center group/item
                   `}
                   title={tx.description || (isExpense ? "Despesa" : "Receita")}
                 >
                   <span className="truncate flex-1">
                     {tx.description || (isExpense ? "Despesa" : "Receita")}
                   </span>
                   
                   {/* Menu de ações específicas no calendário */}
                   {isFuture && isExpense && (
                     <DropdownMenu>
                       <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                         <button className="opacity-0 group-hover/item:opacity-100 hover:text-zinc-900 transition-opacity ml-1 z-10 p-0.5 rounded">
                           •
                         </button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end" className="text-xs bg-white rounded-xl shadow-lg border border-zinc-100 z-50 relative">
                         <DropdownMenuItem
                           onClick={(e) => handleMarkAsPaidToday(tx, e as any)}
                           className="font-bold text-emerald-600 hover:bg-emerald-50 cursor-pointer p-2"
                         >
                           Pagar Antecipado Hoje
                         </DropdownMenuItem>
                       </DropdownMenuContent>
                     </DropdownMenu>
                   )}
                 </div>
               );
             })}
          </div>

          {/* Somatório diário simplificado se houver muitas txs */}
          {(incomeTxs.length > 0 || expenseTxs.length > 0) && dayTxs.length > 3 && (
            <div className="border-t border-zinc-100 pt-1 mt-1 flex justify-between gap-1 text-[9px] font-black opacity-80">
               {incomeTxs.length > 0 && <span className="text-emerald-500">+{incomeTxs.length}</span>}
               {expenseTxs.length > 0 && <span className="text-rose-500">-{expenseTxs.length}</span>}
            </div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
            Calendário
          </h1>
          <p className="text-zinc-400 text-sm font-medium mt-0.5">
            Visão mensal de receitas e despesas
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Navegador de meses com Seletor Dropdown */}
          <div className="flex items-center gap-1 bg-white border border-zinc-100 rounded-2xl px-2 py-1.5">
            <button
               onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
               className="w-8 h-8 flex items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-sm font-black text-zinc-700 px-3 capitalize min-w-[140px] text-center hover:bg-zinc-50 rounded-xl h-8 transition-colors outline-none cursor-pointer select-none">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="bg-white rounded-xl shadow-xl border border-zinc-100 p-2 max-h-[300px] overflow-y-auto min-w-[160px]">
                {Array.from({ length: 48 }).map((_, i) => {
                  const date = addMonths(startOfMonth(new Date()), i - 12); 
                  const isCur = isSameMonth(date, currentMonth);
                  return (
                    <DropdownMenuItem 
                      key={date.toISOString()} 
                      onClick={() => setCurrentMonth(date)} 
                      className={`text-[13px] font-bold capitalize cursor-pointer rounded-lg px-3 py-2 ${isCur ? "bg-emerald-50 text-emerald-600" : "text-zinc-700 hover:bg-zinc-50"}`}
                    >
                      {format(date, "MMMM yyyy", { locale: ptBR })}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
               onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
               className="w-8 h-8 flex items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          
          <Button
             onClick={() => openCreateForDate(new Date())}
             className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
          >
             <Plus className="mr-2 h-4 w-4" /> Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Grid Calendário */}
      <div className="bg-white rounded-3xl border border-zinc-100 p-4 sm:p-6 shadow-sm overflow-x-auto">
         <div className="min-w-[700px]">
           {/* Cabeçalho da Semana */}
           <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-black uppercase tracking-wider text-zinc-400">
             {weekDays.map(d => <div key={d}>{d}</div>)}
           </div>
           
           {/* Corpo do Mês */}
           <div className="grid grid-cols-7 gap-2">
             {renderCells()}
           </div>
         </div>
      </div>

      {/* Dialog Criação via Calendário */}
      <CreateTransactionDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={loadAll}
        defaultDate={selectedDate}
      />
      {/* View Transaction Dialog */}
      <ViewTransactionDialog
        open={!!viewTx}
        onOpenChange={(open) => { if (!open) setViewTx(null); }}
        transaction={viewTx}
        accounts={accounts}
        categories={categories}
        responsibles={responsibles}
        onEditToggle={() => setEditingTx(viewTx)}
      />
      
      <CreateTransactionDialog
        open={!!editingTx}
        onOpenChange={(open) => { if(!open) setEditingTx(null) }}
        onSuccess={() => { setEditingTx(null); loadAll(); }}
        transaction={editingTx ?? undefined}
      />
    </div>
  );
}
