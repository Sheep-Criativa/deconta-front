import { BaseCard } from "@/features/dashboard/components/BaseCard";
import { type Account, AccountType } from "../services/account.service";
import { Building, CreditCard, Banknote, TrendingUp, MoreVertical, Edit, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (id: number) => void;
}

const typeIcons = {
  [AccountType.CHECKING]: Building,
  [AccountType.CREDIT_CARD]: CreditCard,
  [AccountType.CASH]: Banknote,
  [AccountType.INVESTMENT]: TrendingUp,
};

const typeLabels = {
  [AccountType.CHECKING]: "Conta Corrente",
  [AccountType.CREDIT_CARD]: "Cartão de Crédito",
  [AccountType.CASH]: "Dinheiro",
  [AccountType.INVESTMENT]: "Investimento",
};

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const Icon = typeIcons[account.type] || Building;

  return (
    <BaseCard className="relative group hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-100 rounded-lg text-zinc-600">
             <Icon size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-zinc-900">{account.name}</h3>
            <p className="text-sm text-zinc-500">{typeLabels[account.type]}</p>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-600">
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(account)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(account.id)} className="text-red-600 focus:text-red-600">
              <Trash className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div>
        <p className="text-sm text-zinc-500 mb-1">Saldo Atual</p>
        <p className={`text-2xl font-bold ${account.currentBalance < 0 ? "text-red-600" : "text-emerald-600"}`}>
          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: account.currencyCode.trim() }).format(account.currentBalance)}
        </p>
      </div>
      
      {/* Additional Info for Credit Card */}
      {account.type === AccountType.CREDIT_CARD && (
         <div className="mt-4 pt-4 border-t border-zinc-100 grid grid-cols-2 gap-4 text-sm">
            <div>
               <p className="text-zinc-500 text-xs">Fechamento</p>
               <p className="font-medium">Dia {account.closingDay}</p>
            </div>
            <div>
               <p className="text-zinc-500 text-xs">Vencimento</p>
               <p className="font-medium">Dia {account.dueDay ? new Date(account.dueDay).getDate() : "-"}</p>
            </div>
         </div>
      )}
    </BaseCard>
  );
}
