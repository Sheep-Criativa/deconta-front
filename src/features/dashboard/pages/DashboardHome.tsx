import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar,
  PieChart, Pie, Cell, Tooltip as RechartTooltip, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import {
  Wallet, TrendingUp, CreditCard,
  ArrowUpRight, ArrowDownRight, Loader2, List, Tag, ArrowUpCircle, ArrowDownCircle, ChevronRight, ChevronLeft
} from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO, subMonths, isToday, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getAccounts, type Account, AccountType } from "../services/account.service";
import { getTransactions, type Transaction, type TransactionType } from "../services/transaction.service";
import { getStatements, type Statement } from "../services/credit-card.service";
import { BaseCard } from "../components/BaseCard";
import { CreateTransactionDialog } from "../components/CreateTransactionDialog";
import { ICON_MAP } from "../components/CreateCategoryDialog";
import { buildBalanceMap, computeTotalBalance } from "../utils/balanceUtils";
import { OnboardingTour } from "../components/OnboardingTour";

// ─── Chart: Income vs Expense bar chart (last 6 months) ──────────────────────
function buildMonthlyFlow(transactions: Transaction[]) {
  const months: Record<string, { month: string; receita: number; despesa: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(new Date(), i);
    const key = format(d, "yyyy-MM");
    months[key] = { month: format(d, "MMM", { locale: ptBR }), receita: 0, despesa: 0 };
  }
  transactions.forEach(tx => {
    const key = tx.date.slice(0, 7);
    if (!months[key]) return;
    const t = tx.type.trim();
    if (t === "INCOME")  months[key].receita  += Number(tx.amount);
    if (t === "EXPENSE") months[key].despesa  += Number(tx.amount);
  });
  return Object.values(months);
}

// ─── Chart: Spending by category (donut) ─────────────────────────────────────
function buildCategoryData(transactions: Transaction[], categories: { id: number; name: string; color?: string | null }[]) {
  const map: Record<number, { name: string; color: string; value: number }> = {};
  transactions
    .filter(tx => tx.type.trim() === "EXPENSE" && tx.categoryId)
    .forEach(tx => {
      const id = tx.categoryId!;
      if (!map[id]) {
        const cat = categories.find(c => c.id === id);
        map[id] = { name: cat?.name ?? "Outros", color: cat?.color ?? "#94a3b8", value: 0 };
      }
      map[id].value += Number(tx.amount);
    });
  return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 6);
}

// ─── Tooltip custom ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 text-white text-xs rounded-xl px-4 py-3 shadow-xl">
      <p className="font-bold capitalize mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: R$ {Number(p.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      ))}
    </div>
  );
};



// ── Balance Card with per-account mini chart ────────────────────────────────
const ACCOUNT_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#8b5cf6", "#3b82f6", "#ec4899"];

function BalanceCard({ accounts, transactions }: { accounts: Account[]; transactions: Transaction[] }) {
  const nonCcAccounts = accounts.filter(a => a.type.trim() !== AccountType.CREDIT_CARD);
  const balanceMap    = buildBalanceMap(accounts, transactions);
  const total         = computeTotalBalance(accounts, transactions);
  const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const chartData = nonCcAccounts.map((a, i) => ({
    name:    a.name,
    balance: balanceMap.get(a.id) ?? 0,
    color:   ACCOUNT_COLORS[i % ACCOUNT_COLORS.length],
  }));

  return (
    <BaseCard id="tour-dashboard-balance" className="flex flex-col gap-3 rounded-3xl border border-zinc-100 shadow-none">
      {/* Header row */}
      <div className="flex justify-between items-start">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Saldo Total</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600">
          <Wallet size={17} />
        </div>
      </div>

      {/* Big value */}
      <div>
        <h2 className={`text-2xl font-bold tracking-tight ${total >= 0 ? "text-zinc-900" : "text-rose-500"}`}>
          {fmt(total)}
        </h2>
        <p className="text-xs text-zinc-400 font-medium mt-0.5">
          {nonCcAccounts.length} conta{nonCcAccounts.length !== 1 ? "s" : ""} ativa{nonCcAccounts.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Mini per-account bar chart */}
      {chartData.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {chartData.map(d => {
            const pct = total > 0 ? Math.max((d.balance / total) * 100, 0) : 0;
            return (
              <div key={d.name}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-zinc-500 truncate max-w-[60%]">{d.name}</span>
                  <span className="text-[10px] font-black text-zinc-700">{fmt(d.balance)}</span>
                </div>
                <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: d.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </BaseCard>
  );
}

// ─── Recent Transaction Row ──────────────────────────────────────────────────
function RecentTxRow({
  tx,
  accounts,
  categories,
}: {
  tx: Transaction;
  accounts: Account[];
  categories: { id: number; name: string; icon?: string | null; color?: string | null }[];
}) {
  const isExpense = tx.type.trim() === "EXPENSE";
  const cat = categories.find(c => c.id === tx.categoryId);
  const acc = accounts.find(a => a.id === tx.accountId);

  return (
    <div className="flex items-center gap-3 py-3 border-b border-zinc-50 last:border-0 group cursor-default">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105"
        style={{
          backgroundColor: cat?.color || "#f4f4f5",
          color: "#fff"
        }}
      >
        {(() => {
          if (cat?.icon) {
            const LucideIcon = ICON_MAP[cat.icon];
            if (LucideIcon) return <LucideIcon size={18} strokeWidth={1.75} />;
            return <span className="text-lg leading-none">{cat.icon}</span>;
          }
          return isExpense ? <Tag size={18} className="opacity-70" /> : <TrendingUp size={18} className="opacity-70" />;
        })()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-800 truncate">
          {tx.description || cat?.name || (isExpense ? "Despesa" : "Receita")}
        </p>
        <p className="text-[10px] text-zinc-400 font-medium">{acc?.name} · {format(parseISO(tx.date), "dd MMM", { locale: ptBR })}</p>
      </div>
      <span className={`text-sm font-semibold flex-shrink-0 ${isExpense ? "text-zinc-800" : "text-emerald-600"}`}>
        {isExpense ? "-" : "+"} R$ {Number(tx.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
      </span>
    </div>
  );
}

// ─── Mini Card: regular account ─────────────────────────────────────────────
const ACCT_COLORS = ["#10b981", "#6366f1", "#3b82f6", "#f59e0b", "#8b5cf6"];

function AccountMiniCard({ account, computedBalance }: { account: Account; computedBalance: number }) {
  const color = ACCT_COLORS[account.id % ACCT_COLORS.length];
  const typeLabel = {
    CHECKING: "Conta Corrente", CASH: "Dinheiro", INVESTMENT: "Investimento",
  }[account.type.trim()] ?? "Conta";
  return (
    <div
      className="relative flex-shrink-0 w-52 rounded-2xl p-4 text-white overflow-hidden shadow-md"
      style={{ background: color }}
    >
      <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full bg-white/10" />
      <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{typeLabel}</p>
      <p className="text-sm font-bold mt-0.5 truncate">{account.name}</p>
      <p className="text-[9px] font-bold opacity-50 mt-3 uppercase tracking-widest">Saldo disponível</p>
      <p className="text-xl font-bold mt-0.5">
        R$ {computedBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}

// ─── Mini Card: credit card ───────────────────────────────────────────────────
function CreditMiniCard({ account, statementAmount }: { account: Account; statementAmount: number | null }) {
  return (
    <div className="relative flex-shrink-0 w-52 rounded-2xl p-4 bg-zinc-900 text-white overflow-hidden shadow-md">
      <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full bg-white/5" />
      <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Cartão de Crédito</p>
      <p className="text-sm font-bold mt-0.5 truncate">{account.name}</p>
      {statementAmount !== null ? (
        <>
          <p className="text-[9px] font-bold opacity-40 mt-3 uppercase tracking-widest">Fatura aberta</p>
          <p className="text-xl font-bold mt-0.5 text-emerald-400">
            R$ {statementAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </>
      ) : (
        <>
          <p className="text-[9px] font-bold opacity-40 mt-3 uppercase tracking-widest">Fatura</p>
          <p className="text-sm font-bold mt-0.5 opacity-50">Sem fatura aberta</p>
        </>
      )}
      <div className="mt-2 flex items-center gap-1">
        {account.closingDay && (
          <span className="text-[9px] bg-white/10 rounded-full px-2 py-0.5 font-bold">
            Fecha dia {account.closingDay}
          </span>
        )}
      </div>
    </div>
  );
}


// ─── Custom Donut Label ───────────────────────────────────────────────────────
const renderDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={800}>
      {(percent * 100).toFixed(0)}%
    </text>
  );
};

// ─── Dashboard Calendar Preview  ─────────────────────────────────────────────
function DashboardCalendar({ transactions, className }: { transactions: Transaction[]; className?: string }) {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  // Calendário sempre começa na segunda-feira
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  // Realocar o weekDays para bater config de weekStartsOn: 1 se for o caso
  const adjustedWeekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <BaseCard className={`rounded-3xl shadow-none overflow-hidden bg-white border border-zinc-100 p-6 flex flex-col h-full ${className || ''}`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-sm font-bold text-zinc-800 tracking-wide">Calendário Financeiro</h3>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-1.5 bg-black/80 border border-white/5 rounded-xl px-1.5 py-1">
             <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-white/60 hover:text-white p-1 transition-colors rounded-xl">
               <ChevronLeft size={16} />
             </button>
             <span className="text-xs font-bold text-white px-2 tracking-wide capitalize min-w-[100px] text-center">
               {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
             </span>
             <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-white/60 hover:text-white p-1 transition-colors rounded-xl">
               <ChevronRight size={16} />
             </button>
           </div>
           
           <button onClick={() => navigate("/history/calendar")} className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-widest hidden sm:flex items-center gap-1 bg-emerald-500/10 px-3 py-2 rounded-lg">
             Expandir <ArrowUpRight size={12} />
           </button>
        </div>
      </div>
      
      <div className="overflow-x-auto custom-scrollbar -mx-6 px-6 pb-2">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-7 mb-3 border-b border-white/5 pb-2">
            {adjustedWeekDays.map(d => (
              <div key={d} className="text-center text-[9px] font-black uppercase tracking-widest text-zinc-500">
                {d}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 border-t border-l border-zinc-100 bg-white rounded-xl overflow-hidden flex-1">
            {days.map(day => {
              const isCur = isSameMonth(day, monthStart);
              const dayTxs = transactions.filter(t => isSameDay(parseISO(t.date), day));
              const incomes = dayTxs.filter(t => t.type.trim() === "INCOME").reduce((s,t) => s + Number(t.amount), 0);
              const expenses = dayTxs.filter(t => t.type.trim() === "EXPENSE").reduce((s,t) => s + Number(t.amount), 0);

              return (
                 <div 
                   key={day.toString()} 
                   className={`min-h-[75px] p-2 border-b border-r border-black/10 flex flex-col gap-1 transition-colors hover:bg-white/5 cursor-pointer ${!isCur ? 'opacity-30' : ''}`} 
                   onClick={() => navigate("/history/calendar")}
                 >
                   <span className={`text-[10px] font-bold ${isToday(day) ? 'text-emerald-500' : 'text-zinc-500'} mb-1 ml-1`}>{format(day, "d")}</span>
                   {incomes > 0 && <div className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded truncate border border-emerald-500/20">+ {incomes.toLocaleString("pt-BR", {minimumFractionDigits: 1})}</div>}
                   {expenses > 0 && <div className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded truncate border border-rose-500/20">- {expenses.toLocaleString("pt-BR", {minimumFractionDigits: 1})}</div>}
                 </div>
              );
            })}
          </div>
        </div>
      </div>
    </BaseCard>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardHome() {
  const { user } = useAuth();
  const [accounts,     setAccounts]     = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [statements,   setStatements]   = useState<Statement[]>([]);
  const [categories,   setCategories]   = useState<{ id: number; name: string; icon?: string | null; color?: string | null }[]>([]);
  const [loading,      setLoading]      = useState(true);

  const [isTxDialogOp, setIsTxDialogOpen] = useState(false);
  const [txDialogType, setTxDialogType] = useState<TransactionType>("EXPENSE");

  const loadData = async () => {
    if (!user) return;
    const { getCategories } = await import("../services/category.service");
    try {
      const [accs, txs, cats] = await Promise.all([
        getAccounts(user.id),
        getTransactions(user.id),
        getCategories(user.id),
      ]);
      setAccounts(accs.filter(a => a.isActive));
      setTransactions(txs);
      setCategories(cats);

      // Fetch statements for all credit cards
      const ccAccounts = accs.filter(a => a.type.trim() === AccountType.CREDIT_CARD);
      if (ccAccounts.length > 0) {
        const allStmts = await Promise.all(ccAccounts.map(a => getStatements(a.id).catch(() => [])));
        setStatements(allStmts.flat());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setLoading(true);
      loadData();
    }
  }, [user]);

  function handleOpenTx(type: TransactionType) {
    setTxDialogType(type);
    setIsTxDialogOpen(true);
  }

  // KPI calculations
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd   = endOfMonth(now);

  const thisMonthTxs = useMemo(() => transactions.filter(tx => {
    const d = parseISO(tx.date);
    return d >= monthStart && d <= monthEnd;
  }), [transactions]);

  const prevMonthTxs = useMemo(() => {
    const prev = subMonths(now, 1);
    const s = startOfMonth(prev);
    const e = endOfMonth(prev);
    return transactions.filter(tx => { const d = parseISO(tx.date); return d >= s && d <= e; });
  }, [transactions]);

  const [accountTab, setAccountTab] = useState<"contas" | "credito">("contas");

  const nonCcAccounts = useMemo(() => accounts.filter(a => a.type.trim() !== AccountType.CREDIT_CARD), [accounts]);
  const ccAccounts     = useMemo(() => accounts.filter(a => a.type.trim() === AccountType.CREDIT_CARD), [accounts]);
  const balanceMap     = useMemo(() => buildBalanceMap(accounts, transactions), [accounts, transactions]);

  const monthIncome  = thisMonthTxs.filter(t => t.type.trim() === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
  const monthExpense = thisMonthTxs.filter(t => t.type.trim() === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);
  const prevIncome   = prevMonthTxs.filter(t => t.type.trim() === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
  const prevExpense  = prevMonthTxs.filter(t => t.type.trim() === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);

  const incomeTrend  = prevIncome  > 0 ? ((monthIncome  - prevIncome)  / prevIncome)  * 100 : 0;
  const expenseTrend = prevExpense > 0 ? ((monthExpense - prevExpense) / prevExpense) * 100 : 0;

  const monthlyFlow   = useMemo(() => buildMonthlyFlow(transactions), [transactions]);
  const categoryData  = useMemo(() => buildCategoryData(transactions, categories), [transactions, categories]);
  const recentTxs     = useMemo(() => [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7), [transactions]);
  const openStatements = statements.filter(s => s.status.trim() === "OPEN" || s.status.trim() === "CLOSED");

  const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  return (
    <div className="-mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <OnboardingTour />
      
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BalanceCard accounts={accounts} transactions={transactions} />

        {/* Receitas KPI */}
        <BaseCard className="flex flex-col gap-4 rounded-3xl border border-zinc-100 shadow-none">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Receitas do Mês</p>
            <button 
              onClick={() => handleOpenTx('INCOME')}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
            >
              <ArrowUpCircle size={14} />
              Receita
            </button>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{fmt(monthIncome)}</h2>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">{format(now, "MMMM yyyy", { locale: ptBR })}</p>
          </div>
          <div className={`flex items-center gap-1 text-[11px] font-bold ${incomeTrend >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
            {incomeTrend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(incomeTrend).toFixed(1)}% em relação ao mês anterior
          </div>
        </BaseCard>

        {/* Despesas KPI */}
        <BaseCard className="flex flex-col gap-4 rounded-3xl border border-zinc-100 shadow-none">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Despesas do Mês</p>
            <button 
              onClick={() => handleOpenTx('EXPENSE')}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs transition-colors"
            >
              <ArrowDownCircle size={14} />
              Despesa
            </button>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{fmt(monthExpense)}</h2>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">{format(now, "MMMM yyyy", { locale: ptBR })}</p>
          </div>
          <div className={`flex items-center gap-1 text-[11px] font-bold ${expenseTrend >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
            {expenseTrend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(expenseTrend).toFixed(1)}% em relação ao mês anterior
          </div>
        </BaseCard>

      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

        {/* --- ROW 1 --- */}
        {/* Area/Bar Chart: Income vs Expense */}
        <BaseCard id="tour-dashboard-flow" className="rounded-3xl border border-zinc-100 shadow-none lg:col-span-8 flex flex-col h-full">
          <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Fluxo de Caixa</h3>
                <p className="text-[11px] text-zinc-400 font-medium">Últimos 6 meses</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyFlow} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <RechartTooltip content={<CustomTooltip />} />
                <Bar dataKey="receita" name="Receita" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="despesa" name="Despesa" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                <Legend formatter={(val) => <span style={{ fontSize: 11, fontWeight: 700, color: "#71717a" }}>{val}</span>} />
              </BarChart>
            </ResponsiveContainer>
          </BaseCard>

          {/* Donut: Gastos por Categoria */}
          <BaseCard className="rounded-3xl border border-zinc-100 shadow-none lg:col-span-4 flex flex-col h-full">
            <h3 className="text-sm font-bold text-zinc-900 mb-4">Gastos por Categoria</h3>
            {categoryData.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-8">Sem dados este mês.</p>
            ) : (
              <div className="flex-1 flex flex-col">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      labelLine={false}
                      label={renderDonutLabel}
                    >
                      {categoryData.map((entry, i) => (
                        <Cell key={i} fill={entry.color || `hsl(${i * 55}, 65%, 55%)`} />
                      ))}
                    </Pie>
                    <RechartTooltip
                      formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-auto">
                  {categoryData.map((c, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color || `hsl(${i * 55}, 65%, 55%)` }} />
                        <span className="text-[11px] font-bold text-zinc-600 truncate max-w-[120px]">{c.name}</span>
                      </div>
                      <span className="text-[11px] font-bold text-zinc-800">
                        R$ {c.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </BaseCard>

          {/* --- ROW 2 --- */}
          {/* Dashboard Calendar Preview */}
          <DashboardCalendar transactions={transactions} className="lg:col-span-8" />

          {/* Recent Transactions */}
          <BaseCard id="tour-dashboard-recent" className="rounded-3xl border border-zinc-100 shadow-none lg:col-span-4 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center text-white">
                  <List size={14} />
                </div>
                <h3 className="text-sm font-bold text-zinc-900">Últimas Transações</h3>
              </div>
              <a href="/history" className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700">
                Ver todas →
              </a>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
              {recentTxs.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-8">Nenhuma transação ainda.</p>
              ) : (
                recentTxs.map(tx => (
                  <RecentTxRow key={tx.id} tx={tx} accounts={accounts} categories={categories} />
                ))
              )}
            </div>
          </BaseCard>

          {/* --- ROW 3 --- */}
          {/* Credit Card Statements */}
          {openStatements.length > 0 && (
            <BaseCard className="rounded-3xl border border-zinc-100 shadow-none lg:col-span-4 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center text-white">
                  <CreditCard size={14} />
                </div>
                <h3 className="text-sm font-bold text-zinc-900">Faturas Abertas</h3>
              </div>
              <div className="space-y-3 flex-1">
                {openStatements.slice(0, 3).map(s => {
                  const acc = accounts.find(a => a.id === s.accountId);
                  const isOpen = s.status.trim() === "OPEN";
                  return (
                    <div key={s.id} className={`flex items-center justify-between p-3 rounded-2xl ${isOpen ? "bg-emerald-50" : "bg-amber-50"}`}>
                      <div>
                        <p className="text-xs font-bold text-zinc-900">{acc?.name ?? "Cartão"}</p>
                        <p className="text-[10px] text-zinc-500 font-medium">
                          Vence {format(parseISO(s.dueDate), "dd/MM")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${isOpen ? "text-emerald-700" : "text-amber-700"}`}>
                          R$ {Number(s.totalAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                        <p className={`text-[10px] font-bold ${isOpen ? "text-emerald-500" : "text-amber-500"}`}>
                          {isOpen ? "Aberta" : "Fechada"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </BaseCard>
          )}

          {/* ─── Suas Contas ─── */}
          <BaseCard className={`rounded-3xl border border-zinc-100 shadow-none flex flex-col h-full ${openStatements.length > 0 ? "lg:col-span-8" : "lg:col-span-12"}`}>
            {/* Header + tabs */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-zinc-900">Suas Contas</h3>
              <div className="flex items-center gap-4">
                <div className="flex bg-zinc-100 rounded-full p-0.5 gap-0.5">
                  {(["contas", "credito"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setAccountTab(tab)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                        accountTab === tab
                          ? "bg-white text-zinc-900 shadow-sm"
                          : "text-zinc-400 hover:text-zinc-600"
                      }`}
                    >
                      {tab === "contas" ? `Contas (${nonCcAccounts.length})` : `Crédito (${ccAccounts.length})`}
                    </button>
                  ))}
                </div>
                <a href="/account" className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700">Gerenciar →</a>
              </div>
            </div>

            {/* Cards strip */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none flex-1">
              {accountTab === "contas" ? (
                nonCcAccounts.length > 0 ? nonCcAccounts.map(acc => (
                  <AccountMiniCard
                    key={acc.id}
                    account={acc}
                    computedBalance={balanceMap.get(acc.id) ?? 0}
                  />
                )) : (
                  <p className="text-xs text-zinc-400 font-medium py-4">Nenhuma conta bancária cadastrada.</p>
                )
              ) : (
                ccAccounts.length > 0 ? ccAccounts.map(acc => {
                  const stmtRecords = statements.filter(s => s.accountId === acc.id);
                  const unpaidAmount = stmtRecords
                    .filter(s => s.status.trim() !== "PAID")
                    .reduce((sum, s) => sum + Number(s.totalAmount ?? 0), 0);
                  
                  return (
                    <CreditMiniCard
                      key={acc.id}
                      account={acc}
                      statementAmount={unpaidAmount > 0 ? unpaidAmount : null}
                    />
                  );
                }) : (
                  <p className="text-xs text-zinc-400 font-medium py-4">Nenhum cartão de crédito cadastrado.</p>
                )
              )}
            </div>
          </BaseCard>

      </div>

      <CreateTransactionDialog
        open={isTxDialogOp}
        onOpenChange={setIsTxDialogOpen}
        onSuccess={loadData}
        defaultType={txDialogType}
      />
    </div>
  );
}
