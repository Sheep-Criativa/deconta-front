import { useEffect, useState } from "react";
import {
  CreditCard as CardIcon,
  Plus,
  Loader2,
  MoreHorizontal,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getAccounts, type Account, AccountType } from "../services/account.service";
import { getStatements, type Statement } from "../services/credit-card.service";
import { getTransactions, type Transaction } from "../services/transaction.service";
import { getCategories, type Category } from "../services/category.service";
import { CreateAccountDialog } from "../components/CreateAccountDialog";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

function CardVisual({ name, limit, used }: { name: string; limit: number; used: number }) {
  return (
    <div className="relative w-full aspect-[1.7/1] rounded-3xl bg-zinc-900 p-7 text-white overflow-hidden shadow-2xl">
      {/* decorative circles */}
      <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full" />

      {/* chip + nfc */}
      <div className="flex justify-between items-start z-10 relative">
        <div className="w-10 h-8 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md flex items-center justify-center overflow-hidden">
          <div className="grid grid-cols-2 w-full h-full opacity-40 gap-px p-0.5">
            <div className="bg-yellow-900/40 rounded-sm" />
            <div className="bg-yellow-900/40 rounded-sm" />
            <div className="bg-yellow-900/40 rounded-sm" />
            <div className="bg-yellow-900/40 rounded-sm" />
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

      {/* card number */}
      <div className="mt-5 z-10 relative">
        <p className="text-white/50 text-[11px] tracking-[0.25em] font-medium">•••• •••• •••• 7852</p>
      </div>

      {/* name + limit */}
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

      {/* Mastercard logo */}
      <div className="absolute bottom-5 right-6 flex z-10">
        <div className="w-7 h-7 bg-red-500 rounded-full opacity-90" />
        <div className="w-7 h-7 bg-orange-400 rounded-full -ml-3 opacity-90" />
      </div>
    </div>
  );
}

// ─── Card Selector Tab ─────────────────────────────────────────────────────────
function CardTab({ card, active, onClick }: { card: Account; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
        active
          ? "bg-zinc-900 text-white shadow-md"
          : "bg-white text-zinc-500 hover:bg-zinc-50 border border-zinc-100"
      }`}
    >
      <CardIcon size={14} />
      {card.name}
    </button>
  );
}

// ─── Statement Card (upcoming payments style) ──────────────────────────────────
const statusStyles = {
  OPEN:           { label: "Aberta",   dot: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50" },
  CLOSED:         { label: "Fechada",  dot: "bg-amber-500",   text: "text-amber-600",   bg: "bg-amber-50"   },
  PAID:           { label: "Paga",     dot: "bg-blue-500",    text: "text-blue-600",    bg: "bg-blue-50"    },
  PARTIALLY_PAID: { label: "Parcial",  dot: "bg-indigo-500",  text: "text-indigo-600",  bg: "bg-indigo-50"  },
};

function StatementCard({ statement, onClick }: { statement: Statement; card: Account; onClick: () => void }) {
  const normalizedStatus = statement.status?.trim() as keyof typeof statusStyles;
  const s = statusStyles[normalizedStatus] ?? statusStyles.OPEN;
  const month = format(new Date(statement.dueDate), "MMM", { locale: ptBR });
  const year  = format(new Date(statement.dueDate), "yyyy");

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

      <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest capitalize">{month} {year}</p>
      <p className="text-2xl font-black text-zinc-900 tracking-tight mt-0.5">
        R$ {statement.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
      </p>
      <p className="text-zinc-400 text-xs font-medium mt-1">
        Vence em {format(new Date(statement.dueDate), "dd/MM")}
      </p>
    </button>
  );
}

// ─── Real Transaction Row ───────────────────────────────────────────────────────────
function TxRow({ tx, categories }: { tx: Transaction; categories: Category[] }) {
  const isExpense = tx.type.trim() === "EXPENSE";
  const category  = categories.find(c => c.id === tx.categoryId);
  const label     = tx.description || category?.name || (isExpense ? "Despesa" : "Receita");
  const dateStr   = format(parseISO(tx.date), "dd MMM yyyy", { locale: ptBR });

  return (
    <div className="flex items-center py-4 border-b border-zinc-50 last:border-0 group">
      <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center mr-3 text-lg flex-shrink-0">
        {category?.icon ?? (isExpense ? "💳" : "💰")}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-zinc-800 truncate">{label}</p>
        <p className="text-[11px] text-zinc-400 font-medium capitalize">{dateStr}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isExpense
          ? <ArrowDownRight size={14} className="text-rose-400" />
          : <ArrowUpRight size={14} className="text-emerald-400" />
        }
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

// ─── KPI Ring ──────────────────────────────────────────────────────────────────
function LimitRing({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = circ - (pct / 100) * circ;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="130" height="130" className="-rotate-90">
        <circle cx="65" cy="65" r={r} fill="none" stroke="#f4f4f5" strokeWidth="12" />
        <circle
          cx="65" cy="65" r={r}
          fill="none"
          stroke="#10b981"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dash}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-black text-zinc-900">{pct.toFixed(0)}%</p>
        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Usado</p>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CreditCards() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [cards, setCards]               = useState<Account[]>([]);
  const [selectedCard, setSelectedCard]   = useState<Account | null>(null);
  const [statements, setStatements]       = useState<Statement[]>([]);
  const [transactions, setTransactions]   = useState<Transaction[]>([]);
  const [categories, setCategories]       = useState<Category[]>([]);
  const [loading, setLoading]             = useState(true);
  const [loadingStmts, setLoadingStmts]   = useState(false);
  const [loadingTxs, setLoadingTxs]       = useState(false);
  const [isCreateOpen, setIsCreateOpen]   = useState(false);

  const loadCards = async () => {
    if (!user) return;
    const [accounts, cats] = await Promise.all([
      getAccounts(user.id),
      getCategories(user.id),
    ]);
    const cc = accounts.filter(a => a.type.trim() === AccountType.CREDIT_CARD);
    setCards(cc);
    setCategories(cats);
    if (cc.length > 0) setSelectedCard(prev => prev ?? cc[0]);
  };

  useEffect(() => {
    loadCards().finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!selectedCard) return;
    setLoadingStmts(true);
    getStatements(selectedCard.id)
      .then(setStatements)
      .catch(console.error)
      .finally(() => setLoadingStmts(false));

    // Load real transactions for this card
    if (!user) return;
    setLoadingTxs(true);
    getTransactions(user.id)
      .then(txs => setTransactions(txs.filter(t => t.accountId === selectedCard.id)))
      .catch(console.error)
      .finally(() => setLoadingTxs(false));
  }, [selectedCard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  const openStatement   = statements.find(s => s.status === "OPEN");
  const usedAmount      = openStatement?.totalAmount ?? 0;
  const totalLimit      = selectedCard?.limitAmount ?? 0;
  const availableLimit  = totalLimit - usedAmount;
  const upcomingStmts   = statements.filter(s => s.status !== "PAID").slice(0, 3);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Cartões de Crédito</h1>
          <p className="text-zinc-400 text-sm font-medium mt-0.5">Gerencie limites, faturas e gastos.</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 px-6 shadow-lg shadow-emerald-600/20 font-bold transition-all active:scale-95"
        >
          <Plus className="mr-2 h-5 w-5" /> Novo Cartão
        </Button>
      </div>

      {/* ── Card Tabs ── */}
      {cards.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {cards.map(card => (
            <CardTab
              key={card.id}
              card={card}
              active={selectedCard?.id === card.id}
              onClick={() => setSelectedCard(card)}
            />
          ))}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-zinc-100 rounded-3xl p-14 text-center">
          <CardIcon size={44} className="mx-auto text-zinc-200 mb-4" />
          <h3 className="text-lg font-bold text-zinc-900">Nenhum cartão cadastrado</h3>
          <p className="text-zinc-400 text-sm mt-1">Clique em "Novo Cartão" para começar.</p>
        </div>
      ) : (
        /* ── 3-Column Grid ── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── LEFT: Card + Transactions ── */}
          <div className="lg:col-span-4 space-y-6">
            {selectedCard && (
              <CardVisual
                name={selectedCard.name}
                limit={totalLimit}
                used={usedAmount}
              />
            )}

            {/* Recent Transactions */}
            <div className="bg-white rounded-3xl p-6 border border-zinc-100">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-black text-zinc-900">Transações Recentes</h3>
                <button className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  Ver todas <ChevronRight size={12} />
                </button>
              </div>
              {loadingTxs ? (
                <div className="space-y-3 mt-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-12 bg-zinc-50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-xs text-zinc-400 font-medium py-6 text-center">Nenhuma transação neste cartão.</p>
              ) : (
                <div>
                  {transactions.slice(0, 5).map(tx => (
                    <TxRow key={tx.id} tx={tx} categories={categories} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── CENTER: Upcoming Statements ── */}
          <div className="lg:col-span-5 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest text-zinc-400">Próximas Faturas</h3>
            </div>

            {loadingStmts ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-zinc-50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : upcomingStmts.length > 0 ? (
              <div className="space-y-4">
                {upcomingStmts.map(s => (
                  <StatementCard
                    key={s.id}
                    statement={s}
                    card={selectedCard!}
                    onClick={() => navigate(
                      `/cards/${selectedCard!.id}/statement/${s.id}`,
                      { state: { statement: s, card: selectedCard } }
                    )}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-10 text-center border-2 border-dashed border-zinc-100">
                <p className="text-zinc-400 text-sm font-medium">Nenhuma fatura pendente.</p>
              </div>
            )}

            {statements.length > upcomingStmts.length && (
              <div className="space-y-4 mt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Faturas pagas</p>
                {statements.filter(s => s.status === "PAID").map(s => (
                  <StatementCard
                    key={s.id}
                    statement={s}
                    card={selectedCard!}
                    onClick={() => navigate(
                      `/cards/${selectedCard!.id}/statement/${s.id}`,
                      { state: { statement: s, card: selectedCard } }
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: KPIs + Ring ── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Saved / Available block */}
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

            {/* Usage ring */}
            <div className="bg-white rounded-3xl p-6 border border-zinc-100 flex flex-col items-center gap-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Uso do Limite</p>
              <LimitRing used={usedAmount} limit={totalLimit} />
              <div className="w-full grid grid-cols-2 gap-3 text-center">
                <div className="bg-zinc-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Usado</p>
                  <p className="text-sm font-black text-zinc-900 mt-0.5">
                    R$ {usedAmount.toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase text-emerald-600 tracking-wider">Livre</p>
                  <p className="text-sm font-black text-emerald-700 mt-0.5">
                    R$ {availableLimit.toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>

            {/* Closing day info */}
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
        onSuccess={async () => {
          await loadCards();
        }}
      />
    </div>
  );
}
