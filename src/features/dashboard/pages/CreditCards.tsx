import { useEffect, useMemo, useState } from "react";
import {
  CreditCard as CardIcon,
  Plus,
  Loader2,
  MoreHorizontal,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  LayoutGrid,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getAccounts, type Account, AccountType } from "../services/account.service";
import { getStatements, type Statement } from "../services/credit-card.service";
import { getTransactions, type Transaction } from "../services/transaction.service";
import { getCategories, type Category } from "../services/category.service";
import { getResponsibles, type Responsible } from "../services/responsible.service";
import { CreateAccountDialog } from "../components/CreateAccountDialog";
import { CreateTransactionDialog } from "../components/CreateTransactionDialog";
import { ICON_MAP } from "../components/CreateCategoryDialog";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  `R$ ${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// ─── Card Visual ───────────────────────────────────────────────────────────────
function CardVisual({ name, limit, used }: { name: string; limit: number; used: number }) {
  return (
    <div className="relative w-full aspect-[1.7/1] rounded-3xl bg-zinc-900 p-7 text-white overflow-hidden shadow-2xl">
      <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full" />

      <div className="flex justify-between items-start z-10 relative">
        <div className="w-10 h-8 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md flex items-center justify-center overflow-hidden">
          <div className="grid grid-cols-2 w-full h-full opacity-40 gap-px p-0.5">
            <div className="bg-yellow-900/40 rounded-sm" /><div className="bg-yellow-900/40 rounded-sm" />
            <div className="bg-yellow-900/40 rounded-sm" /><div className="bg-yellow-900/40 rounded-sm" />
          </div>
        </div>
        <div className="text-white/60">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M8 12C8 9.79 9.79 8 12 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M5 12C5 8.13 8.13 5 12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div className="mt-5 z-10 relative">
        <p className="text-white/50 text-[11px] tracking-[0.25em] font-medium">•••• •••• •••• 7852</p>
      </div>

      <div className="mt-4 flex justify-between items-end z-10 relative">
        <div>
          <p className="text-white/40 text-[9px] uppercase font-bold tracking-widest">Titular</p>
          <p className="text-white font-bold text-sm tracking-wide mt-0.5">{name}</p>
        </div>
        <div className="text-right">
          <p className="text-white/40 text-[9px] uppercase font-bold tracking-widest">Limite</p>
          <p className="text-emerald-400 font-black text-sm mt-0.5">
            R$ {(limit - used).toLocaleString("pt-BR")}
          </p>
        </div>
      </div>

      <div className="absolute bottom-5 right-6 flex z-10">
        <div className="w-7 h-7 bg-red-500 rounded-full opacity-90" />
        <div className="w-7 h-7 bg-orange-400 rounded-full -ml-3 opacity-90" />
      </div>
    </div>
  );
}

// ─── Card Tab Button ────────────────────────────────────────────────────────────
function CardTab({ label, icon, active, onClick }: { label: string; icon?: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
        active
          ? "bg-zinc-900 text-white shadow-md"
          : "bg-white text-zinc-500 hover:bg-zinc-50 border border-zinc-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Statement Status Styles ────────────────────────────────────────────────────
const statusStyles = {
  OPEN:           { label: "Aberta",   dot: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50" },
  CLOSED:         { label: "Fechada",  dot: "bg-amber-500",   text: "text-amber-600",   bg: "bg-amber-50"   },
  PAID:           { label: "Paga",     dot: "bg-blue-500",    text: "text-blue-600",    bg: "bg-blue-50"    },
  PARTIALLY_PAID: { label: "Parcial",  dot: "bg-indigo-500",  text: "text-indigo-600",  bg: "bg-indigo-50"  },
};

function StatementCard({ statement, onClick }: { statement: Statement; card: Account; onClick: () => void }) {
  const normalizedStatus = statement.status?.trim() as keyof typeof statusStyles;
  const s = statusStyles[normalizedStatus] ?? statusStyles.OPEN;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl p-5 border border-zinc-100 hover:shadow-md hover:border-emerald-100 transition-all group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
          <CardIcon size={18} className={s.text} />
        </div>
        <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </span>
      </div>

      <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest capitalize">
        {format(new Date(statement.dueDate), "MMM yyyy", { locale: ptBR })}
      </p>
      <p className="text-2xl font-black text-zinc-900 tracking-tight mt-0.5">
        {fmt(statement.totalAmount)}
      </p>
      <p className="text-zinc-400 text-xs font-medium mt-1">
        Vence em {format(new Date(statement.dueDate), "dd/MM")}
      </p>
    </button>
  );
}

// ─── Transaction Row ────────────────────────────────────────────────────────────
function TxRow({ tx, categories }: { tx: Transaction; categories: Category[] }) {
  const isExpense = tx.type.trim() === "EXPENSE";
  const category  = categories.find(c => c.id === tx.categoryId);
  const label     = tx.description || category?.name || (isExpense ? "Despesa" : "Receita");

  return (
    <div className="flex items-center py-4 border-b border-zinc-50 last:border-0 group">
      <div
        className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center mr-3 flex-shrink-0"
        style={category?.color ? { backgroundColor: category.color, color: "#fff" } : {}}
      >
        {(() => {
          if (category?.icon) {
            const LucideIcon = ICON_MAP[category.icon];
            if (LucideIcon) return <LucideIcon size={16} strokeWidth={2} />;
            return <p className="text-lg leading-none">{category.icon}</p>;
          }
          return isExpense ? <CardIcon size={16} /> : <p className="text-lg leading-none">💰</p>;
        })()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-zinc-800 truncate">{label}</p>
        <p className="text-[11px] text-zinc-400 font-medium capitalize">
          {format(parseISO(tx.date), "dd MMM yyyy", { locale: ptBR })}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isExpense ? <ArrowDownRight size={14} className="text-rose-400" /> : <ArrowUpRight size={14} className="text-emerald-400" />}
        <span className={`text-sm font-black ${isExpense ? "text-zinc-800" : "text-emerald-600"}`}>
          {isExpense ? "-" : "+"}R$ {Number(tx.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </span>
      </div>
      <button className="ml-3 text-zinc-300 hover:text-zinc-500 transition-colors">
        <MoreHorizontal size={16} />
      </button>
    </div>
  );
}

// ─── Limit Ring ────────────────────────────────────────────────────────────────
function LimitRing({ used, limit }: { used: number; limit: number }) {
  const pct  = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const r    = 52;
  const circ = 2 * Math.PI * r;
  const color = pct > 80 ? "#f43f5e" : pct > 50 ? "#f59e0b" : "#10b981";

  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#f4f4f5" strokeWidth="10" />
        <circle
          cx="64" cy="64" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={circ - (pct / 100) * circ}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-black text-zinc-900">{pct.toFixed(0)}%</p>
        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Usado</p>
      </div>
    </div>
  );
}

// ─── Overview Panel (Geral) ────────────────────────────────────────────────────
interface OverviewPanelProps {
  cards:        Account[];
  allStmts:     Record<number, Statement[]>;   // accountId → statements
  allTxs:       Transaction[];                 // all CC transactions
  responsibles: Responsible[];
  categories:   Category[];
  navigate:     (path: string, opts?: any) => void;
}

function OverviewPanel({ cards, allStmts, allTxs, responsibles, categories, navigate }: OverviewPanelProps) {
  const [filterRespId, setFilterRespId] = useState<number | null>(null);

  // ── Aggregates ──
  const totalLimit     = cards.reduce((s, c) => s + Number(c.limitAmount ?? 0), 0);
  const totalUsed      = cards.reduce((s, c) => {
    const open = (allStmts[c.id] ?? []).find(st => st.status.trim() === "OPEN" || st.status.trim() === "CLOSED");
    return s + Number(open?.totalAmount ?? 0);
  }, 0);
  const totalAvailable = totalLimit - totalUsed;

  // ── Upcoming bills across ALL cards ──
  const upcomingAll = cards.flatMap(c =>
    (allStmts[c.id] ?? [])
      .filter(st => st.status.trim() !== "PAID")
      .map(st => ({ stmt: st, card: c }))
  ).sort((a, b) => new Date(a.stmt.dueDate).getTime() - new Date(b.stmt.dueDate).getTime());

  // ── Expenses filtered by responsible ──
  const expenses = allTxs.filter(t => t.type.trim() === "EXPENSE");
  const filteredTxs = filterRespId
    ? expenses.filter(t => t.responsibleId === filterRespId)
    : expenses;

  // ── Spend by responsible ──
  const spendByResp = useMemo(() => {
    const map: Record<number | string, number> = {};
    expenses.forEach(t => {
      const key = t.responsibleId ?? "sem_resp";
      map[key] = (map[key] ?? 0) + Number(t.amount);
    });
    return map;
  }, [expenses]);

  const totalExpenses = Object.values(spendByResp).reduce((a, b) => a + b, 0);

  // ── Recent txs filtered ──
  const recentFiltered = [...filteredTxs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

      {/* ── LEFT: KPI summary + responsible breakdown ── */}
      <div className="lg:col-span-4 space-y-5">

        {/* Total limit / usage */}
        <div className="bg-zinc-900 rounded-3xl p-6 text-white space-y-1">
          <p className="text-white/50 text-[10px] uppercase font-black tracking-widest">Limite Total</p>
          <p className="text-3xl font-black tracking-tight">{fmt(totalAvailable)}</p>
          <p className="text-white/40 text-[11px] font-medium">disponível de {fmt(totalLimit)}</p>

          <div className="mt-4 grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
            <div>
              <p className="text-white/40 text-[9px] uppercase font-bold tracking-wider">Usado</p>
              <p className="text-base font-black text-rose-400 mt-0.5">{fmt(totalUsed)}</p>
            </div>
            <div>
              <p className="text-white/40 text-[9px] uppercase font-bold tracking-wider">Livre</p>
              <p className="text-base font-black text-emerald-400 mt-0.5">{fmt(totalAvailable)}</p>
            </div>
          </div>
        </div>

        {/* Per-card mini summary */}
        <div className="bg-white rounded-3xl p-5 border border-zinc-100 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Por Cartão</p>
          {cards.map(card => {
            const open = (allStmts[card.id] ?? []).find(st => st.status.trim() === "OPEN" || st.status.trim() === "CLOSED");
            const used = Number(open?.totalAmount ?? 0);
            const lim  = Number(card.limitAmount ?? 0);
            const pct  = lim > 0 ? Math.min((used / lim) * 100, 100) : 0;
            return (
              <div key={card.id} className="space-y-1">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-zinc-800">{card.name}</p>
                  <p className="text-xs font-black text-zinc-700">{fmt(used)}</p>
                </div>
                <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct > 80 ? "bg-rose-500" : pct > 50 ? "bg-amber-400" : "bg-emerald-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-zinc-400 font-medium">{pct.toFixed(0)}% de {fmt(lim)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CENTER: Upcoming bills (all cards) ── */}
      <div className="lg:col-span-5 space-y-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Próximas Faturas — Todos os Cartões</p>

        {upcomingAll.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border-2 border-dashed border-zinc-100">
            <p className="text-zinc-400 text-sm font-medium">Nenhuma fatura pendente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingAll.map(({ stmt, card }) => (
              <button
                key={stmt.id}
                onClick={() => navigate(`/cards/${card.id}/statement/${stmt.id}`, { state: { statement: stmt, card } })}
                className="w-full text-left bg-white rounded-2xl p-4 border border-zinc-100 hover:shadow-md hover:border-emerald-100 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center">
                      <CardIcon size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-zinc-800">{card.name}</p>
                      <p className="text-[10px] text-zinc-400 font-medium capitalize">
                        Vence {format(new Date(stmt.dueDate), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-zinc-900">{fmt(stmt.totalAmount)}</p>
                    {(() => {
                      const s = statusStyles[stmt.status.trim() as keyof typeof statusStyles] ?? statusStyles.OPEN;
                      return (
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>{s.label}</span>
                      );
                    })()}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── RIGHT: Responsible breakdown + filtered txs ── */}
      <div className="lg:col-span-3 space-y-5">

        {/* Responsible filter */}
        <div className="bg-white rounded-3xl p-5 border border-zinc-100 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Gastos por Responsável</p>

          {/* "Todos" pill */}
          <button
            onClick={() => setFilterRespId(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              filterRespId === null ? "bg-zinc-900 text-white" : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <LayoutGrid size={12} />
            <span className="flex-1 text-left">Todos</span>
            <span className="font-black">{fmt(totalExpenses)}</span>
          </button>

          {/* Per-responsible rows */}
          {Object.entries(spendByResp).map(([key, amount]) => {
            const respId  = key === "sem_resp" ? null : Number(key);
            const resp    = responsibles.find(r => r.id === respId);
            const name    = resp?.name ?? "Sem responsável";
            const color   = resp?.color ?? "#71717a";
            const pct     = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
            const isActive = filterRespId === respId;

            return (
              <button
                key={key}
                onClick={() => setFilterRespId(isActive ? null : respId)}
                className={`w-full text-left rounded-xl p-3 transition-all space-y-1.5 border ${
                  isActive ? "border-zinc-300 bg-zinc-50 shadow-sm" : "border-transparent bg-zinc-50/50 hover:bg-zinc-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: color + "22" }}>
                      <User size={10} style={{ color }} />
                    </div>
                    <p className="text-xs font-bold text-zinc-800 truncate max-w-[90px]">{name}</p>
                  </div>
                  <p className="text-xs font-black text-zinc-700">{fmt(amount)}</p>
                </div>
                <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
                <p className="text-[10px] text-zinc-400 font-medium">{pct.toFixed(1)}% do total</p>
              </button>
            );
          })}

          {totalExpenses === 0 && (
            <p className="text-xs text-zinc-400 text-center py-2">Nenhum gasto registrado.</p>
          )}
        </div>

        {/* Filtered recent transactions */}
        {recentFiltered.length > 0 && (
          <div className="bg-white rounded-3xl p-5 border border-zinc-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">
              {filterRespId
                ? `Gastos — ${responsibles.find(r => r.id === filterRespId)?.name ?? "Responsável"}`
                : "Transações Recentes"}
            </p>
            {recentFiltered.map(tx => (
              <TxRow key={tx.id} tx={tx} categories={categories} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CreditCards() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [cards, setCards]               = useState<Account[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<number | "geral">("geral");
  const [allStmts, setAllStmts]         = useState<Record<number, Statement[]>>({});
  const [allTxs, setAllTxs]             = useState<Transaction[]>([]);   // all CC txs
  const [cardTxs, setCardTxs]           = useState<Transaction[]>([]);   // selected card txs
  const [categories, setCategories]     = useState<Category[]>([]);
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);
  const [loading, setLoading]           = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isNewTxOpen, setIsNewTxOpen]   = useState(false);

  const selectedCard = cards.find(c => c.id === selectedCardId);

  // ── Load all cards + meta ──
  const loadCards = async () => {
    if (!user) return;
    const [accounts, cats, resps, txs] = await Promise.all([
      getAccounts(user.id),
      getCategories(user.id),
      getResponsibles(user.id),
      getTransactions(user.id),
    ]);
    const cc = accounts.filter(a => a.type.trim() === AccountType.CREDIT_CARD);
    setCards(cc);
    setCategories(cats);
    setResponsibles(resps);

    // All CC transactions
    const ccIds = new Set(cc.map(c => c.id));
    setAllTxs(txs.filter(t => ccIds.has(t.accountId)));

    // Statements for every card
    if (cc.length > 0) {
      const stmtResults = await Promise.all(cc.map(c => getStatements(c.id).catch(() => [] as Statement[])));
      const map: Record<number, Statement[]> = {};
      cc.forEach((c, i) => { map[c.id] = stmtResults[i]; });
      setAllStmts(map);
    }
  };

  useEffect(() => {
    loadCards().finally(() => setLoading(false));
  }, [user]);

  // ── When a specific card is selected, filter its txs ──
  useEffect(() => {
    if (selectedCardId === "geral" || typeof selectedCardId !== "number") {
      setCardTxs([]);
      return;
    }
    setLoadingDetail(true);
    setCardTxs(allTxs.filter(t => t.accountId === selectedCardId));
    setLoadingDetail(false);
  }, [selectedCardId, allTxs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  // Per-card detail values
  const stmts         = allStmts[selectedCard?.id ?? -1] ?? [];
  const openStatement = stmts.find(s => s.status.trim() === "OPEN");
  const usedAmount    = openStatement?.totalAmount ?? 0;
  const totalLimit    = selectedCard?.limitAmount ?? 0;
  const availableLimit = totalLimit - usedAmount;
  const upcomingStmts = stmts.filter(s => s.status.trim() !== "PAID").slice(0, 3);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Cartões de Crédito</h1>
          <p className="text-zinc-400 text-sm font-medium mt-0.5">Gerencie limites, faturas e gastos.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsNewTxOpen(true)}
            variant="outline"
            className="rounded-xl h-12 px-5 font-bold border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-all active:scale-95"
          >
            <Plus className="mr-2 h-4 w-4" /> Nova Despesa
          </Button>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 px-6 shadow-lg shadow-emerald-600/20 font-bold transition-all active:scale-95"
          >
            <Plus className="mr-2 h-5 w-5" /> Novo Cartão
          </Button>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex gap-2 flex-wrap">
        {/* Geral tab — always visible */}
        <CardTab
          label="Geral"
          icon={<LayoutGrid size={14} />}
          active={selectedCardId === "geral"}
          onClick={() => setSelectedCardId("geral")}
        />
        {cards.map(card => (
          <CardTab
            key={card.id}
            label={card.name}
            icon={<CardIcon size={14} />}
            active={selectedCardId === card.id}
            onClick={() => setSelectedCardId(card.id)}
          />
        ))}
      </div>

      {/* ── No cards empty state ── */}
      {cards.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-zinc-100 rounded-3xl p-14 text-center">
          <CardIcon size={44} className="mx-auto text-zinc-200 mb-4" />
          <h3 className="text-lg font-bold text-zinc-900">Nenhum cartão cadastrado</h3>
          <p className="text-zinc-400 text-sm mt-1">Clique em "Novo Cartão" para começar.</p>
        </div>

      ) : selectedCardId === "geral" ? (
        /* ── GERAL OVERVIEW ── */
        <OverviewPanel
          cards={cards}
          allStmts={allStmts}
          allTxs={allTxs}
          responsibles={responsibles}
          categories={categories}
          navigate={navigate}
        />

      ) : (
        /* ── INDIVIDUAL CARD DETAIL ── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT: Card visual + txs */}
          <div className="lg:col-span-4 space-y-6">
            {selectedCard && (
              <CardVisual name={selectedCard.name} limit={totalLimit} used={usedAmount} />
            )}

            <div className="bg-white rounded-3xl p-6 border border-zinc-100">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-black text-zinc-900">Transações Recentes</h3>
                <button className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  Ver todas <ChevronRight size={12} />
                </button>
              </div>
              {loadingDetail ? (
                <div className="space-y-3 mt-2">
                  {[1,2,3].map(i => <div key={i} className="h-12 bg-zinc-50 rounded-xl animate-pulse" />)}
                </div>
              ) : cardTxs.length === 0 ? (
                <p className="text-xs text-zinc-400 font-medium py-6 text-center">Nenhuma transação neste cartão.</p>
              ) : (
                <div>
                  {cardTxs.slice(0, 5).map(tx => (
                    <TxRow key={tx.id} tx={tx} categories={categories} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CENTER: Upcoming Statements */}
          <div className="lg:col-span-5 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Próximas Faturas</h3>
            </div>

            {upcomingStmts.length > 0 ? (
              <div className="space-y-4">
                {upcomingStmts.map(s => (
                  <StatementCard
                    key={s.id}
                    statement={s}
                    card={selectedCard!}
                    onClick={() => navigate(`/cards/${selectedCard!.id}/statement/${s.id}`, { state: { statement: s, card: selectedCard } })}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-10 text-center border-2 border-dashed border-zinc-100">
                <p className="text-zinc-400 text-sm font-medium">Nenhuma fatura pendente.</p>
              </div>
            )}

            {stmts.length > upcomingStmts.length && (
              <div className="space-y-4 mt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Faturas pagas</p>
                {stmts.filter(s => s.status.trim() === "PAID").map(s => (
                  <StatementCard
                    key={s.id}
                    statement={s}
                    card={selectedCard!}
                    onClick={() => navigate(`/cards/${selectedCard!.id}/statement/${s.id}`, { state: { statement: s, card: selectedCard } })}
                  />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: KPIs */}
          <div className="lg:col-span-3 space-y-5">
            <div className="bg-zinc-900 rounded-3xl p-6 text-white space-y-1">
              <div className="flex justify-between items-start">
                <p className="text-white/50 text-[10px] uppercase font-black tracking-widest">Disponível Agora</p>
                <TrendingUp size={14} className="text-emerald-400" />
              </div>
              <p className="text-3xl font-black tracking-tight">
                R$ {availableLimit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-white/40 text-[11px] font-medium">
                de R$ {totalLimit.toLocaleString("pt-BR")} no total
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-zinc-100 flex flex-col items-center gap-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Uso do Limite</p>
              <LimitRing used={usedAmount} limit={totalLimit} />
              <div className="w-full grid grid-cols-2 gap-3 text-center">
                <div className="bg-zinc-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Usado</p>
                  <p className="text-sm font-black text-zinc-900 mt-0.5">R$ {usedAmount.toLocaleString("pt-BR")}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase text-emerald-600 tracking-wider">Livre</p>
                  <p className="text-sm font-black text-emerald-700 mt-0.5">R$ {availableLimit.toLocaleString("pt-BR")}</p>
                </div>
              </div>
            </div>

            {selectedCard?.closingDay && (
              <div className="bg-white rounded-2xl p-5 border border-zinc-100">
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">Fechamento</p>
                <p className="text-2xl font-black text-zinc-900">Dia {selectedCard.closingDay}</p>
                <p className="text-[11px] text-zinc-400 font-medium mt-0.5">do mês corrente</p>
              </div>
            )}
          </div>
        </div>
      )}

      <CreateAccountDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        defaultType={AccountType.CREDIT_CARD}
        onSuccess={async () => { await loadCards(); }}
      />

      <CreateTransactionDialog
        open={isNewTxOpen}
        onOpenChange={setIsNewTxOpen}
        defaultType="EXPENSE"
        // On a specific card tab → pre-select and lock that card
        // On Geral tab → show only CC accounts for selection
        {...(typeof selectedCardId === "number"
          ? { defaultAccountId: selectedCardId }
          : { onlyCreditCards: true }
        )}
        onSuccess={async () => { await loadCards(); }}
      />
    </div>
  );
}
