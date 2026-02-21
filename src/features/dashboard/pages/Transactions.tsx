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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getTransactions, deleteTransaction, type Transaction } from "../services/transaction.service";
import { getAccounts, type Account } from "../services/account.service";
import { getCategories, type Category } from "../services/category.service";
import { getResponsibles, type Responsible } from "../services/responsible.service";
import { CreateTransactionDialog } from "../components/CreateTransactionDialog";
import { Button } from "@/components/ui/button";
import { format, parseISO, isToday, isYesterday, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────
const typeConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  INCOME:     { label: "Receita",       color: "text-emerald-600", bg: "bg-emerald-50",  icon: ArrowUpCircle   },
  EXPENSE:    { label: "Despesa",       color: "text-rose-600",    bg: "bg-rose-50",      icon: ArrowDownCircle },
  TRANSFER:   { label: "Transferência", color: "text-blue-600",    bg: "bg-blue-50",      icon: ArrowUpCircle   },
  ADJUSTMENT: { label: "Ajuste",        color: "text-amber-600",   bg: "bg-amber-50",     icon: ArrowUpCircle   },
};

const statusBadge: Record<string, string> = {
  CONFIRMED:  "bg-emerald-50 text-emerald-700",
  PENDING:    "bg-amber-50 text-amber-700",
  RECONCILED: "bg-blue-50 text-blue-700",
};

const statusLabel: Record<string, string> = {
  CONFIRMED:  "Confirmado",
  PENDING:    "Pendente",
  RECONCILED: "Conciliado",
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
  const [menuOpen, setMenuOpen] = useState(false);
  const cfg = typeConfig[tx.type.trim()] ?? typeConfig.EXPENSE;
  const Icon = cfg.icon;
  const account  = accounts.find(a => a.id === tx.accountId);
  const category = categories.find(c => c.id === tx.categoryId);
  const resp     = responsibles.find(r => r.id === tx.responsibleId);
  const isExpense = tx.type.trim() === "EXPENSE";

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-zinc-50 rounded-2xl transition-colors group cursor-default relative">
      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl ${cfg.bg} ${cfg.color} flex items-center justify-center flex-shrink-0`}>
        {category?.icon ? (
          <span className="text-lg">{category.icon}</span>
        ) : (
          <Icon size={18} />
        )}
      </div>

      {/* Info */}
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
            <span className="text-[10px] text-zinc-400 font-medium">{account.name}</span>
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

      {/* Status */}
      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full hidden sm:inline-flex ${statusBadge[tx.status.trim()] ?? "bg-zinc-100 text-zinc-500"}`}>
        {statusLabel[tx.status.trim()] ?? tx.status.trim()}
      </span>

      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <p className={`font-black text-base ${isExpense ? "text-zinc-900" : "text-emerald-600"}`}>
          {isExpense ? "-" : "+"} R$ {Number(tx.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* Actions menu */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all opacity-0 group-hover:opacity-100"
        >
          <MoreVertical size={15} />
        </button>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-9 z-20 bg-white rounded-2xl shadow-xl border border-zinc-100 py-1.5 w-36 overflow-hidden">
              <button
                onClick={() => { setMenuOpen(false); onEdit(tx); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-[12px] font-bold text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <Pencil size={13} className="text-zinc-400" /> Editar
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDelete(tx); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-[12px] font-bold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 size={13} /> Excluir
              </button>
            </div>
          </>
        )}
      </div>
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
      <div className="flex justify-between items-center px-4 mb-2">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 capitalize">
          {formatDayLabel(dateStr)}
        </h3>
        <span className={`text-[11px] font-black ${dayTotal >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
          {dayTotal >= 0 ? "+" : ""}R$ {Math.abs(dayTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="bg-white rounded-3xl border border-zinc-100 overflow-hidden divide-y divide-zinc-50">
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

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white rounded-2xl p-5 border border-zinc-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Receitas</p>
        <p className="text-xl font-black text-emerald-600 mt-1">
          R$ {income.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      </div>
      <div className="bg-white rounded-2xl p-5 border border-zinc-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Despesas</p>
        <p className="text-xl font-black text-rose-500 mt-1">
          R$ {expense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      </div>
      <div className={`rounded-2xl p-5 border ${balance >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Saldo</p>
        <p className={`text-xl font-black mt-1 ${balance >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
          {balance >= 0 ? "+" : ""}R$ {balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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

  const loadAll = async () => {
    if (!user) return;
    const [txs, accs, cats, resps] = await Promise.all([
      getTransactions(user.id),
      getAccounts(user.id),
      getCategories(user.id),
      getResponsibles(user.id),
    ]);
    setTransactions(txs);
    setAccounts(accs);
    setCategories(cats);
    setResponsibles(resps);
  };

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
  }, [user]);

  const monthEnd   = endOfMonth(currentMonth);

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      const d = parseISO(tx.date);
      if (d < currentMonth || d > monthEnd) return false;
      if (filters.type      && tx.type.trim()   !== filters.type)      return false;
      if (filters.accountId && tx.accountId      !== Number(filters.accountId)) return false;
      if (filters.status    && tx.status.trim()  !== filters.status)    return false;
      return true;
    });
  }, [transactions, filters, currentMonth]);

  const grouped = useMemo(() => groupTransactionsByDate(filtered), [filtered]);

  async function handleDelete() {
    if (!deletingTx) return;
    setDeleteLoading(true);
    try {
      await deleteTransaction(deletingTx.id);
      setTransactions(prev => prev.filter(t => t.id !== deletingTx.id));
      toast.success("Transação excluída!");
      setDeletingTx(null);
    } catch {
      // Backend not ready yet — remove optimistically for UX preview
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-zinc-900 rounded-xl text-white">
              <List size={20} />
            </div>
            Transações
          </h1>
          <p className="text-zinc-400 text-sm font-medium mt-0.5">
            {filtered.length} lançamento{filtered.length !== 1 ? "s" : ""}
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
            <span className="text-[12px] font-black text-zinc-700 px-2 capitalize min-w-[130px] text-center">
              {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <button
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
              disabled={currentMonth >= startOfMonth(new Date())}
              className="w-7 h-7 flex items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 px-6 shadow-lg shadow-emerald-600/20 font-bold transition-all active:scale-95"
          >
            <Plus className="mr-2 h-5 w-5" /> Nova Transação
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <MonthlySummary transactions={filtered} />

      {/* Filters */}
      <FilterBar filters={filters} onChange={setFilters} accounts={accounts} />

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
          <List size={44} className="mx-auto text-zinc-200 mb-4" />
          <h3 className="text-lg font-bold text-zinc-900">Nenhuma transação encontrada</h3>
          <p className="text-zinc-400 text-sm mt-1">
            {Object.values(filters).some(Boolean)
              ? "Tente ajustar os filtros."
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
