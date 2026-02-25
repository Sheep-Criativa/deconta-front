import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Tag,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getStatements, updateStatementStatus, type Statement } from "../services/credit-card.service";
import { getTransactions, type Transaction } from "../services/transaction.service";
import { getCategories, type Category } from "../services/category.service";
import { getAccounts, type Account } from "../services/account.service";
import { ICON_MAP } from "../components/CreateCategoryDialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

// Status helpers
const statusConfig = {
  OPEN:           { label: "Aberta",  bg: "bg-emerald-50",  text: "text-emerald-700",  dot: "bg-emerald-500", icon: Clock },
  CLOSED:         { label: "Fechada", bg: "bg-amber-50",    text: "text-amber-700",    dot: "bg-amber-500",   icon: AlertCircle },
  PAID:           { label: "Paga",    bg: "bg-blue-50",     text: "text-blue-700",     dot: "bg-blue-500",    icon: CheckCircle2 },
  PARTIALLY_PAID: { label: "Parcial", bg: "bg-indigo-50",   text: "text-indigo-700",   dot: "bg-indigo-500",  icon: AlertCircle },
};

// Transaction row
function TxRow({ tx, categories }: { tx: Transaction; categories: Category[] }) {
  const isExpense = tx.type.trim() === "EXPENSE";
  const category  = categories.find(c => c.id === tx.categoryId);
  const label     = tx.description || category?.name || (isExpense ? "Despesa" : "Receita");
  const dateStr   = format(parseISO(tx.date), "dd/MM/yyyy");

  return (
    <div className="flex items-center gap-4 py-4 border-b border-zinc-50 last:border-0 group cursor-default">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105"
        style={{
          backgroundColor: category?.color || "#f4f4f5",
          color: "#fff"
        }}
      >
        {(() => {
          if (category?.icon) {
            const LucideIcon = ICON_MAP[category.icon];
            if (LucideIcon) return <LucideIcon size={18} strokeWidth={1.75} />;
            return <span className="text-lg leading-none">{category.icon}</span>;
          }
          return isExpense ? <Tag size={18} className="opacity-70" /> : <TrendingUp size={18} className="opacity-70" />;
        })()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-zinc-800 truncate">{label}</p>
        {category && (
          <p className="text-[11px] text-zinc-400 font-medium">{category.name}</p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <div className="flex items-center gap-1 justify-end">
          {isExpense
            ? <ArrowDownRight size={13} className="text-rose-400" />
            : <ArrowUpRight size={13} className="text-emerald-400" />
          }
          <span className={`text-sm font-black ${isExpense ? "text-zinc-800" : "text-emerald-600"}`}>
            {isExpense ? "-" : "+"}R${" "}
            {Number(tx.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-[11px] text-zinc-400 mt-0.5">{dateStr}</p>
      </div>
    </div>
  );
}

// KPI chip
function KpiChip({ label, value, sub, highlight }: {
  label: string; value: string; sub?: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-5 ${highlight ? "bg-zinc-900 text-white" : "bg-white border border-zinc-100"}`}>
      <p className={`text-[10px] font-black uppercase tracking-widest ${highlight ? "text-white/50" : "text-zinc-400"}`}>
        {label}
      </p>
      <p className={`text-2xl font-black tracking-tight mt-1 ${highlight ? "text-white" : "text-zinc-900"}`}>
        {value}
      </p>
      {sub && (
        <p className={`text-[11px] font-medium mt-0.5 ${highlight ? "text-white/50" : "text-zinc-400"}`}>{sub}</p>
      )}
    </div>
  );
}

// Main page
export default function StatementDetail() {
  const { cardId, statementId } = useParams<{ cardId: string; statementId: string }>();
  const { state }   = useLocation();          // may contain { statement, card } passed from CreditCards
  const navigate    = useNavigate();
  const { user }    = useAuth();

  const [statement,    setStatement]    = useState<Statement | null>(state?.statement ?? null);
  const [card,         setCard]         = useState<Account   | null>(state?.card      ?? null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [loading,      setLoading]      = useState(!state?.statement);
  const [paying,       setPaying]       = useState(false);

  // Load statement + card if not passed via navigation state
  useEffect(() => {
    if (!user) return;
    if (statement && card) {
      // Already have them — just load transactions & categories
      loadTxsAndCats();
      return;
    }

    async function bootstrap() {
      try {
        const [accounts, stmts] = await Promise.all([
          getAccounts(user!.id),
          getStatements(Number(cardId)),
        ]);
        const foundStmt = stmts.find(s => s.id === Number(statementId));
        const foundCard = accounts.find(a => a.id === Number(cardId));
        setStatement(foundStmt ?? null);
        setCard(foundCard ?? null);
      } finally {
        setLoading(false);
      }
    }
    bootstrap().then(() => loadTxsAndCats());
  }, [user]);

  async function loadTxsAndCats() {
    if (!user) return;
    const [txs, cats] = await Promise.all([
      getTransactions(user.id),
      getCategories(user.id),
    ]);
    setTransactions(txs);
    setCategories(cats);
  }

  // Filter transactions that fall within the statement period for this card
  const statementTxs = useMemo(() => {
    if (!statement) return [];
    const start = parseISO(statement.startDate);
    const end   = parseISO(statement.endDate);
    return transactions.filter(tx => {
      if (tx.accountId !== Number(cardId)) return false;
      const d = parseISO(tx.date);
      return isWithinInterval(d, { start, end });
    });
  }, [transactions, statement, cardId]);

  const totalExpenses = useMemo(
    () => statementTxs.filter(t => t.type.trim() === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0),
    [statementTxs]
  );
  const totalIncome = useMemo(
    () => statementTxs.filter(t => t.type.trim() === "INCOME").reduce((s, t) => s + Number(t.amount), 0),
    [statementTxs]
  );

  async function handlePay() {
    if (!statement || !card) return;
    setPaying(true);
    try {
      const updated = await updateStatementStatus(statement.id, card.id, "PAID");
      setStatement(updated);
      toast.success("Fatura marcada como paga!");
    } catch {
      toast.error("Erro ao pagar fatura.");
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  if (!statement || !card) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500 font-medium">Fatura não encontrada.</p>
        <Button onClick={() => navigate("/cards")} variant="outline" className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  const normalizedStatus = statement.status?.trim() as keyof typeof statusConfig;
  const cfg = statusConfig[normalizedStatus] ?? statusConfig.OPEN;
  const StatusIcon = cfg.icon;
  const canPay = statement.status?.trim() !== "PAID";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/cards")}
          className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 transition-all shadow-sm"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              Fatura de{" "}
              {format(parseISO(statement.dueDate), "MMMM yyyy", { locale: ptBR })}
            </h1>
            <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>
          <p className="text-zinc-400 text-sm font-medium mt-0.5 flex items-center gap-1.5">
            <CreditCard size={13} />
            {card.name}
          </p>
        </div>
        {canPay && (
          <Button
            onClick={handlePay}
            disabled={paying}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-5 font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
          >
            {paying
              ? <><Loader2 size={14} className="mr-1.5 animate-spin" /> Pagando...</>
              : <><CheckCircle2 size={14} className="mr-1.5" /> Marcar como Paga</>
            }
          </Button>
        )}
      </div>

      {/* ── Period banner ── */}
      <div className="bg-white rounded-2xl border border-zinc-100 px-5 py-3 flex items-center gap-2 text-sm font-medium text-zinc-500">
        <Calendar size={14} />
        Período:{" "}
        <span className="font-black text-zinc-800">
          {format(parseISO(statement.startDate), "dd/MM/yyyy")}
          {" "}→{" "}
          {format(parseISO(statement.endDate), "dd/MM/yyyy")}
        </span>
        <span className="mx-2 text-zinc-200">|</span>
        Vencimento:{" "}
        <span className="font-black text-zinc-800">
          {format(parseISO(statement.dueDate), "dd/MM/yyyy")}
        </span>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-3 gap-4">
        <KpiChip
          label="Total da Fatura"
          value={`R$ ${statement.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          highlight
        />
        <KpiChip
          label="Despesas"
          value={`R$ ${totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          sub={`${statementTxs.filter(t => t.type.trim() === "EXPENSE").length} transações`}
        />
        <KpiChip
          label="Créditos"
          value={`R$ ${totalIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          sub={`${statementTxs.filter(t => t.type.trim() === "INCOME").length} transações`}
        />
      </div>

      {/* ── Transactions ── */}
      <div className="bg-white rounded-3xl border border-zinc-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest text-zinc-400">
            Lançamentos do Período
          </h2>
          <span className="text-[11px] font-black text-zinc-400 bg-zinc-50 px-2.5 py-1 rounded-full">
            {statementTxs.length} lancamento{statementTxs.length !== 1 ? "s" : ""}
          </span>
        </div>

        {statementTxs.length === 0 ? (
          <div className="py-14 text-center">
            <TrendingDown size={36} className="mx-auto text-zinc-200 mb-3" />
            <p className="text-sm font-bold text-zinc-900">Nenhuma transação neste período</p>
            <p className="text-xs text-zinc-400 mt-1">
              {format(parseISO(statement.startDate), "dd MMM", { locale: ptBR })}
              {" "}–{" "}
              {format(parseISO(statement.endDate), "dd MMM yyyy", { locale: ptBR })}
            </p>
          </div>
        ) : (
          <div>
            {statementTxs
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(tx => (
                <TxRow key={tx.id} tx={tx} categories={categories} />
              ))}
          </div>
        )}
      </div>

      {/* ── Status card at bottom (if paid) ── */}
      {statement.status === "PAID" && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 flex items-center gap-3 text-blue-700">
          <CheckCircle2 size={18} className="flex-shrink-0" />
          <div>
            <p className="text-sm font-black">Fatura Paga</p>
            <p className="text-xs font-medium opacity-70">Esta fatura já foi liquidada.</p>
          </div>
        </div>
      )}

    </div>
  );
}
