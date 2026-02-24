import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { type Account, AccountType, getAccounts, deleteAccount } from "../services/account.service";
import { getTransactions, type Transaction } from "../services/transaction.service";
import { AccountCard } from "../components/AccountCard";
import { CreateAccountDialog } from "../components/CreateAccountDialog";
import { toast } from "sonner";
import { buildBalanceMap } from "../utils/balanceUtils";

export default function Accounts() {
  const { user } = useAuth();
  const [accounts,     setAccounts]     = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  async function fetchData() {
    if (!user) return;
    try {
      setLoading(true);
      const [accs, txs] = await Promise.all([
        getAccounts(user.id),
        getTransactions(user.id),
      ]);
      setAccounts(accs);
      setTransactions(txs);
    } catch (error) {
      console.error("Failed to fetch accounts/transactions", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [user]);

  // Only non-credit-card accounts belong on this page
  const nonCcAccounts = accounts.filter(a => a.type.trim() !== AccountType.CREDIT_CARD);

  // Compute real balances from transactions (for all accounts so lookup works)
  const balanceMap = buildBalanceMap(accounts, transactions);

  async function handleDelete(id: number) {
    if (!user) return;
    try {
      await deleteAccount(id, user.id);
      setAccounts(prev => prev.filter(a => a.id !== id));
      toast.success("Conta excluída!");
    } catch (error) {
      console.error("Failed to delete account", error);
      toast.error("Erro ao excluir conta.");
    }
  }

  function handleEdit(account: Account) {
    setEditingAccount(account);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Minhas Contas</h1>
           <p className="text-zinc-400 text-sm font-medium mt-0.5">Gerencie suas contas bancárias e cartões.</p>
        </div>
         
         <Button onClick={() => setIsCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 px-6 shadow-lg shadow-emerald-600/20 font-bold transition-all active:scale-95">
            <Plus className="mr-2 h-5 w-5" />
            Nova Conta
         </Button>
      </div>
      
      {loading ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
               <div key={i} className="h-40 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
         </div>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nonCcAccounts.map((account) => (
               <AccountCard 
                  key={account.id} 
                  account={account}
                  computedBalance={balanceMap.get(account.id)}
                  onEdit={handleEdit} 
                  onDelete={handleDelete} 
               />
            ))}
            
            {nonCcAccounts.length === 0 && (
               <div className="col-span-full py-12 text-center text-zinc-500 bg-white rounded-2xl border border-dashed border-zinc-200">
                  <p>Nenhuma conta bancária cadastrada.</p>
               </div>
            )}
         </div>
      )}

      <CreateAccountDialog 
         open={isCreateOpen} 
         onOpenChange={setIsCreateOpen} 
         onSuccess={fetchData} 
      />
      <CreateAccountDialog
        open={!!editingAccount}
        editingAccount={editingAccount}
        onOpenChange={(open) => { if (!open) setEditingAccount(null); }}
        onSuccess={() => { setEditingAccount(null); fetchData(); }}
      />
    </div>
  );
}

