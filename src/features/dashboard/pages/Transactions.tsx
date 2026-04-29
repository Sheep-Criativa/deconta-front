import { useEffect, useState, useMemo } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Loader2,
  List,
  X,
  Pencil,
  Trash2,
  MoreVertical,
  CheckCircle2,
  CreditCard,
  Landmark,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getTransactions, deleteTransaction, type Transaction } from "../services/transaction.service";
import { getAccounts, type Account, AccountType } from "../services/account.service";
import { getCategories, type Category } from "../services/category.service";
import { getResponsibles, type Responsible } from "../services/responsible.service";
import { CreateTransactionDialog } from "../components/CreateTransactionDialog";
import { ICON_MAP } from "../components/CreateCategoryDialog";
import { Button } from "@/components/ui/button";
import { format, parseISO, isToday, isYesterday, startOfMonth, endOfMonth, subMonths, addMonths, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Helpers ────────────────────────────────────────────────────────────────
type ViewTab = "geral" | "contas" | "cartoes";

const typeConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  INCOME:   { label: "Receita",       color: "text-emerald-600", bg: "bg-emerald-50", icon: ArrowUpCircle   },
  EXPENSE:  { label: "Despesa",       color: "text-rose-600",    bg: "bg-rose-50",    icon: ArrowDownCircle },
  TRANSFER: { label: "Transferência", color: "text-blue-600",    bg: "bg-blue-50",    icon: ArrowUpCircle   },
};

const statusConfig: Record<string, { label: string; badge: string; icon: any }> = {
  CONFIRMED:  { label: "Confirmado", badge: "bg-emerald-50 text-emerald-700 border border-emerald-100", icon: CheckCircle2 },
  PENDING:    { label: "Pendente",   badge: "bg-amber-50 text-amber-700 border border-amber-100",       icon: Clock3       },
  RECONCILED: { label: "Conciliado", badge: "bg-blue-50 text-blue-700 border border-blue-100",          icon: ShieldCheck  },
};

function groupTransactionsByDate(txs: Transaction[]) {
  const groups: Record<string, Transaction[]> = {};
  txs.forEach(tx => {
    const day = tx.date.split("T")[0];
    if (!groups[day]) groups[day] = [];
    groups[day].push(tx);
  });
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

function formatDayLabel(dateStr: string) {
  const d = parseISO(dateStr);
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return format(d, "EEEE, dd 'de' MMMM", { locale: ptBR });
}

// ─── Transaction Row ────────────────────────────────────────────────────────
function TransactionRow({
  tx,
  accounts,
  categories,
  responsibles,
  onEdit,
  onDelete,
}: {
  tx: Transaction;
  accounts: Account[];
  categories: Category[];
  responsibles: Responsible[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}) {
  const cfg      = typeConfig[tx.type.trim()] ?? typeConfig.EXPENSE;
  const stCfg    = statusConfig[tx.status.trim()] ?? statusConfig.CONFIRMED;
  const Icon     = cfg.icon;
  const StatusIcon = stCfg.icon;
  const account  = accounts.find(a => a.id === tx.accountId);
  const category = categories.find(c => c.id === tx.categoryId);
  const resp     = responsibles.find(r => r.id === tx.responsibleId);
  const isExpense  = tx.type.trim() === "EXPENSE";
  const isCreditCard = account?.type.trim() === AccountType.CREDIT_CARD;

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50/80 rounded-2xl transition-colors group cursor-default relative">

      {/* Category icon */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.color}`}
        style={category?.color ? { backgroundColor: category.color, color: "#fff" } : {}}
      >
        {(() => {
          if (category?.icon) {
            const LucideIcon = ICON_MAP[category.icon];
            if (LucideIcon) return <LucideIcon size={18} strokeWidth={1.75} />;
            return <span className="text-lg leading-none">{category.icon}</span>;
          }
          return <Icon size={18} />;
        })()}
      </div>

      {/* Description + account + resp */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-zinc-900 truncate">
          {tx.description || category?.name || cfg.label}
          {tx.installmentTotal && tx.installmentTotal > 1 && (
            <span className="ml-2 text-[10px] font-black text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
              {tx.installmentNum}/{tx.installmentTotal}
            </span>
          )}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {account && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
              {isCreditCard
                ? <CreditCard size={10} className="text-zinc-300" />
                : <Landmark size={10} className="text-zinc-300" />}
              {account.name}
            </span>
          )}
          {resp && (
            <>
              <span className="text-zinc-200">·</span>
              <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: resp.color || "#94a3b8" }}
                />
                {resp.name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Tipo badge */}
      <span className={`hidden md:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color} flex-shrink-0`}>
        <Icon size={10} />
        {cfg.label}
      </span>

      {/* Status badge */}
      <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex-shrink-0 ${stCfg.badge}`}>
        <StatusIcon size={10} />
        {stCfg.label}
      </span>

      {/* Amount */}
      <div className="text-right flex-shrink-0 min-w-[90px]">
        <p className={`font-black text-base tabular-nums ${isExpense ? "text-zinc-900" : "text-emerald-600"}`}>
          {isExpense ? "−" : "+"} R$ {Number(tx.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* Actions menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all flex-shrink-0">
            <MoreVertical size={15} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-white rounded-2xl shadow-xl border border-zinc-100 py-1.5 w-36">
          <DropdownMenuItem
            onClick={() => onEdit(tx)}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-[12px] font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
          >
            <Pencil size={13} className="text-zinc-400" /> Editar
          </DropdownMenuItem>
          {(isExpense && tx.status.trim() === "PENDING" && new Date(tx.date) > new Date()) && (
            <DropdownMenuItem
              onClick={async () => {
                const newDesc = tx.description ? `${tx.description} - (Antecipado)` : "Pagamento (Antecipado)";
                try {
                  const { updateTransaction } = await import("../services/transaction.service");
                  await updateTransaction(tx.id, {
                    userId: 0, // will be overridden by the backend with the auth user
                    status: "CONFIRMED",
                    paymentDate: new Date(),
                    description: newDesc,
                  });
                  toast.success("Pagamento antecipado marcado!");
                  window.location.reload();
                } catch {
                  toast.error("Erro ao antecipar.");
                }
              }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-[12px] font-bold text-emerald-600 hover:bg-emerald-50 cursor-pointer"
            >
              <CheckCircle2 size={13} className="text-emerald-500" /> Antecipar Hoje
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => onDelete(tx)}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-[12px] font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
          >
            <Trash2 size={13} /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── Day Group ──────────────────────────────────────────────────────────────
function DayGroup({
  dateStr,
  transactions,
  accounts,
  categories,
  responsibles,
  onEdit,
  onDelete,
}: {
  dateStr: string;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  responsibles: Responsible[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}) {
  const dayTotal = transactions.reduce((sum, tx) => {
    const t = tx.type.trim();
    return t === "INCOME" ? sum + Number(tx.amount) : sum - Number(tx.amount);
  }, 0);

  return (
    <div>
      <div className="flex justify-between items-center px-1 mb-2">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 capitalize">
          {formatDayLabel(dateStr)}
        </h3>
        <span className={`text-[11px] font-black ${dayTotal >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
          {dayTotal >= 0 ? "+" : ""}R$ {Math.abs(dayTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="bg-white rounded-3xl border border-zinc-100 overflow-hidden divide-y divide-zinc-50/80">
        {transactions.map(tx => (
          <TransactionRow
            key={tx.id}
            tx={tx}
            accounts={accounts}
            categories={categories}
            responsibles={responsibles}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Filter Bar ─────────────────────────────────────────────────────────────
interface Filters {
  type: string;
  accountId: string;
  status: string;
}

function FilterBar({
  filters,
  onChange,
  accounts,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  accounts: Account[];
}) {
  const hasFilters = filters.type || filters.accountId || filters.status;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Type filter */}
      <div className="flex gap-1 bg-white border border-zinc-100 rounded-2xl p-1.5">
        {[["", "Todos"], ["INCOME", "Receitas"], ["EXPENSE", "Despesas"]].map(([val, label]) => (
          <button
            key={val}
            onClick={() => onChange({ ...filters, type: val })}
            className={`px-4 py-1.5 rounded-xl text-[11px] font-black transition-all ${
              filters.type === val
                ? "bg-zinc-900 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Account filter */}
      <select
        value={filters.accountId}
        onChange={e => onChange({ ...filters, accountId: e.target.value })}
        className="h-9 px-3 text-[11px] font-bold text-zinc-600 bg-white border border-zinc-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="">Todas as contas</option>
        {accounts.map(a => (
          <option key={a.id} value={String(a.id)}>{a.name}</option>
        ))}
      </select>

      {/* Status filter */}
      <select
        value={filters.status}
        onChange={e => onChange({ ...filters, status: e.target.value })}
        className="h-9 px-3 text-[11px] font-bold text-zinc-600 bg-white border border-zinc-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="">Todos status</option>
        <option value="PENDING">Pendente</option>
        <option value="CONFIRMED">Confirmado</option>
        <option value="RECONCILED">Conciliado</option>
      </select>

      {hasFilters && (
        <button
          onClick={() => onChange({ type: "", accountId: "", status: "" })}
          className="flex items-center gap-1 text-[11px] font-bold text-rose-500 hover:text-rose-700 px-2"
        >
          <X size={12} /> Limpar filtros
        </button>
      )}
    </div>
  );
}

// ─── Monthly Summary KPIs ───────────────────────────────────────────────────
function MonthlySummary({ transactions }: { transactions: Transaction[] }) {
  const income  = transactions.filter(t => t.type.trim() === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
  const expense = transactions.filter(t => t.type.trim() === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;
  const pending = transactions.filter(t => t.status.trim() === "PENDING").length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="bg-white rounded-2xl p-5 border border-zinc-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Receitas</p>
        <p className="text-xl font-black text-emerald-600 mt-1 tabular-nums">
          R$ {income.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      </div>
      <div className="bg-white rounded-2xl p-5 border border-zinc-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Despesas</p>
        <p className="text-xl font-black text-rose-500 mt-1 tabular-nums">
          R$ {expense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      </div>
      <div className={`rounded-2xl p-5 border ${balance >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Saldo</p>
        <p className={`text-xl font-black mt-1 tabular-nums ${balance >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
          {balance >= 0 ? "+" : ""}R$ {balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      </div>
      <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Pendentes</p>
        <p className="text-xl font-black text-amber-700 mt-1">
          {pending} lançamento{pending !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts,     setAccounts]     = useState<Account[]>([]);
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTx,    setEditingTx]    = useState<Transaction | null>(null);
  const [deletingTx,   setDeletingTx]   = useState<Transaction | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({ type: "", accountId: "", status: "" });
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [viewTab, setViewTab] = useState<ViewTab>("geral");

  const loadAll = async () => {
    if (!user) return;
    const [txs, accs, cats, resps] = await Promise.all([
      getTransactions(user.id),
      getAccounts(user.id),
      getCategories(user.id),
      getResponsibles(user.id),
    ]);
    setTransactions(txs);
    setAccounts(accs.filter(a => a.isActive));
    setCategories(cats);
    setResponsibles(resps);
  };

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
  }, [user]);

  // Separate account lists for the view tabs
  const creditCardAccountIds = useMemo(
    () => new Set(accounts.filter(a => a.type.trim() === AccountType.CREDIT_CARD).map(a => a.id)),
    [accounts]
  );
  const bankAccountIds = useMemo(
    () => new Set(accounts.filter(a => a.type.trim() !== AccountType.CREDIT_CARD).map(a => a.id)),
    [accounts]
  );

  const monthEnd = endOfMonth(currentMonth);

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      const d = parseISO(tx.date);
      if (d < currentMonth || d > monthEnd) return false;

      // View tab filtering
      if (viewTab === "contas"   && !bankAccountIds.has(tx.accountId))      return false;
      if (viewTab === "cartoes"  && !creditCardAccountIds.has(tx.accountId)) return false;

      // Additional filters
      if (filters.type      && tx.type.trim()  !== filters.type)                   return false;
      if (filters.accountId && tx.accountId    !== Number(filters.accountId))       return false;
      if (filters.status    && tx.status.trim() !== filters.status)                 return false;
      return true;
    });
  }, [transactions, filters, currentMonth, viewTab, creditCardAccountIds, bankAccountIds]);

  const grouped = useMemo(() => groupTransactionsByDate(filtered), [filtered]);

  async function handleDelete() {
    if (!deletingTx || !user) return;
    setDeleteLoading(true);
    try {
      await deleteTransaction(deletingTx.id, user.id);
      setTransactions(prev => prev.filter(t => t.id !== deletingTx.id));
      toast.success("Transação excluída!");
      setDeletingTx(null);
    } catch {
      setTransactions(prev => prev.filter(t => t.id !== deletingTx.id));
      toast.success("Transação excluída!");
      setDeletingTx(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  const tabs: { key: ViewTab; label: string; icon: any; count: number }[] = [
    {
      key: "geral",
      label: "Geral",
      icon: List,
      count: transactions.filter(tx => {
        const d = parseISO(tx.date);
        return d >= currentMonth && d <= monthEnd;
      }).length,
    },
    {
      key: "contas",
      label: "Contas",
      icon: Landmark,
      count: transactions.filter(tx => {
        const d = parseISO(tx.date);
        return d >= currentMonth && d <= monthEnd && bankAccountIds.has(tx.accountId);
      }).length,
    },
    {
      key: "cartoes",
      label: "Cartões",
      icon: CreditCard,
      count: transactions.filter(tx => {
        const d = parseISO(tx.date);
        return d >= currentMonth && d <= monthEnd && creditCardAccountIds.has(tx.accountId);
      }).length,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Transações</h1>
          <p className="text-zinc-400 text-sm font-medium mt-0.5">
            {filtered.length} lançamento{filtered.length !== 1 ? "s" : ""} em {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month navigator */}
          <div className="flex items-center gap-1 bg-white border border-zinc-100 rounded-2xl px-2 py-1.5">
            <button
              onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-[12px] font-black text-zinc-700 px-2 capitalize min-w-[130px] text-center hover:bg-zinc-100 py-1.5 rounded-lg transition-colors cursor-pointer outline-none">
                  {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="bg-white rounded-2xl shadow-xl py-2 w-48 max-h-[300px] overflow-y-auto border border-zinc-100">
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
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-5 font-bold transition-all rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            <Plus className="mr-2 h-5 w-5" /> Nova Transação
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <MonthlySummary transactions={filtered} />

      {/* View Tabs */}
      <div className="flex items-center gap-2">
        <div className="flex bg-white border border-zinc-100 rounded-2xl p-1.5 gap-1">
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            const active = viewTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setViewTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black transition-all ${
                  active
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
                }`}
              >
                <TabIcon size={12} />
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  active ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-400"
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Additional filters */}
        <FilterBar filters={filters} onChange={setFilters} accounts={
          viewTab === "contas"
            ? accounts.filter(a => a.type.trim() !== AccountType.CREDIT_CARD)
            : viewTab === "cartoes"
              ? accounts.filter(a => a.type.trim() === AccountType.CREDIT_CARD)
              : accounts
        } />
      </div>

      {/* Delete confirmation banner */}
      {deletingTx && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-rose-700">Excluir transação?</p>
            <p className="text-xs text-rose-500 font-medium mt-0.5">
              {deletingTx.description || "Sem descrição"} · R$ {Number(deletingTx.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDeletingTx(null)}
              className="px-4 py-2 text-xs font-bold text-zinc-600 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-60"
            >
              {deleteLoading ? "Excluindo..." : "Confirmar Exclusão"}
            </button>
          </div>
        </div>
      )}

      {/* Transaction list */}
      {grouped.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-zinc-100 rounded-3xl p-14 text-center">
          {viewTab === "cartoes"
            ? <CreditCard size={44} className="mx-auto text-zinc-200 mb-4" />
            : viewTab === "contas"
              ? <Landmark size={44} className="mx-auto text-zinc-200 mb-4" />
              : <List size={44} className="mx-auto text-zinc-200 mb-4" />}
          <h3 className="text-lg font-bold text-zinc-900">Nenhuma transação encontrada</h3>
          <p className="text-zinc-400 text-sm mt-1">
            {Object.values(filters).some(Boolean)
              ? "Tente ajustar os filtros."
              : viewTab === "cartoes"
                ? "Nenhum lançamento de cartão de crédito neste mês."
                : viewTab === "contas"
                  ? "Nenhum lançamento em contas bancárias neste mês."
                  : "Clique em \"Nova Transação\" para começar."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([dateStr, txs]) => (
            <DayGroup
              key={dateStr}
              dateStr={dateStr}
              transactions={txs}
              accounts={accounts}
              categories={categories}
              responsibles={responsibles}
              onEdit={setEditingTx}
              onDelete={setDeletingTx}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <CreateTransactionDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={loadAll}
      />

      {/* Edit dialog */}
      <CreateTransactionDialog
        open={!!editingTx}
        onOpenChange={(open) => { if (!open) setEditingTx(null); }}
        onSuccess={() => { setEditingTx(null); loadAll(); }}
        transaction={editingTx ?? undefined}
      />
    </div>
  );
}
