import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { type Account, getAccounts, deleteAccount } from "../services/account.service";
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

  // Compute real balances from transactions
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
           <h1 className="text-2xl font-bold text-zinc-900">Minhas Contas</h1>
           <p className="text-zinc-500">Gerencie suas contas bancárias e cartões.</p>
        </div>
         
         <Button onClick={() => setIsCreateOpen(true)} className="bg-emerald-500 hover:bg-emerald-600">
            <Plus className="mr-2 h-4 w-4" />
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
            {accounts.map((account) => (
               <AccountCard 
                  key={account.id} 
                  account={account}
                  computedBalance={balanceMap.get(account.id)}
                  onEdit={handleEdit} 
                  onDelete={handleDelete} 
               />
            ))}
            
            {accounts.length === 0 && (
               <div className="col-span-full py-12 text-center text-zinc-500 bg-white rounded-2xl border border-dashed border-zinc-200">
                  <p>Nenhuma conta cadastrada.</p>
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
        onOpenChange={(open) => { if (!open) setEditingAccount(null); }}
        onSuccess={() => { setEditingAccount(null); fetchData(); }}
      />
    </div>
  );
}

