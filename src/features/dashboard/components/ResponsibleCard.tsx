import { BaseCard } from "@/features/dashboard/components/BaseCard";
import { type Responsible } from "../services/responsible.service";
import { MoreVertical, Edit, Trash, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ResponsibleCardProps {
  responsible: Responsible;
  onEdit: (responsible: Responsible) => void;
  onDelete: (id: number) => void;
}

export function ResponsibleCard({ responsible, onEdit, onDelete }: ResponsibleCardProps) {
  return (
    <BaseCard className={`relative group hover:shadow-lg transition-shadow border-l-4 ${responsible.isActive ? 'border-l-emerald-500' : 'border-l-zinc-300'}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div 
            className="p-3 rounded-full text-white font-bold flex items-center justify-center shadow-sm"
            style={{ backgroundColor: responsible.color || '#10b981' }} // Default to emerald-500 if no color
          >
             <User size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-zinc-900">{responsible.name}</h3>
            <div className="flex items-center gap-2">
               <span className={`text-xs px-2 py-0.5 rounded-full ${responsible.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                  {responsible.isActive ? 'Ativo' : 'Inativo'}
               </span>
            </div>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100">
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white">
            <DropdownMenuItem onClick={() => onEdit(responsible)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(responsible.id)} className="text-red-600 focus:text-red-600">
              <Trash className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </BaseCard>
  );
}
