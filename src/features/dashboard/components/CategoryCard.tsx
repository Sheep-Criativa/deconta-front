import { Edit, Trash, MoreVertical, Tag } from "lucide-react";
import type { Category } from "../services/category.service";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { ICON_MAP } from "./CreateCategoryDialog";

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: number) => void;
}

export function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  const isIncome = category.type.trim() === "INCOME";

  // Resolve icon: if value is a key in ICON_MAP → render as Lucide icon
  // Otherwise fall back to rendering as emoji/text (backwards compat)
  const LucideIcon = category.icon ? ICON_MAP[category.icon] : null;

  return (
    <Card className={`relative group hover:shadow-lg transition-all border-l-4 p-5 rounded-2xl bg-white ${isIncome ? "border-l-emerald-500" : "border-l-rose-500"}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110"
            style={{ backgroundColor: category.color || "#f4f4f5" }}
          >
            {LucideIcon ? (
              <LucideIcon size={22} strokeWidth={1.75} className="text-white" />
            ) : category.icon ? (
              <span className="text-2xl leading-none">{category.icon}</span>
            ) : (
              <Tag size={20} className="text-white/70" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 text-base">{category.name}</h3>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
              isIncome ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            }`}>
              {isIncome ? "Receita" : "Despesa"}
            </span>
          </div>
        </div>

        {/* Actions — visible only on hover */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white rounded-xl shadow-xl border-zinc-100 w-32">
            <DropdownMenuItem
              onClick={() => onEdit(category)}
              className="px-3 py-2 cursor-pointer hover:bg-zinc-50 rounded-lg text-zinc-600 transition-colors"
            >
              <Edit className="mr-2 h-4 w-4" />
              <span>Editar</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(category.id)}
              className="px-3 py-2 cursor-pointer text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors"
            >
              <Trash className="mr-2 h-4 w-4" />
              <span>Excluir</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
