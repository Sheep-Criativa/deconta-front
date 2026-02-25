import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCategory, updateCategory, type Category } from "../services/category.service";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  ShoppingCart, Home, Car, Utensils, Smartphone, Heart, GraduationCap,
  Gamepad2, Plane, Zap, Fuel, Laptop, Shirt, Gift, Film, Dumbbell,
  PawPrint, Sparkles, Trees, Wallet, TrendingUp, Briefcase, Music,
  Coffee, Bus, BookOpen, Baby, Wrench, Globe,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Icon registry ──────────────────────────────────────────────────────────────
// Key = stored value in DB, Value = Lucide component
export const ICON_MAP: Record<string, LucideIcon> = {
  ShoppingCart, Home, Car, Utensils, Smartphone, Heart, GraduationCap,
  Gamepad2, Plane, Zap, Fuel, Laptop, Shirt, Gift, Film, Dumbbell,
  PawPrint, Sparkles, Trees, Wallet, TrendingUp, Briefcase, Music,
  Coffee, Bus, BookOpen, Baby, Wrench, Globe,
};

export const PRESET_ICON_KEYS = Object.keys(ICON_MAP) as (keyof typeof ICON_MAP)[];

const formSchema = z.object({
  name:  z.string().min(3, "O nome deve ter pelo menos 3 caracteres").max(100),
  icon:  z.string().min(1, "Selecione um ícone"),
  color: z.string().min(1, "Selecione uma cor"),
  type:  z.enum(["INCOME", "EXPENSE"]),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  categoryToEdit?: Category | null;
  /** Pre-select type when opening from another form */
  defaultType?: "INCOME" | "EXPENSE";
}

const PRESET_COLORS = [
  "#10b981", "#3b82f6", "#ef4444", "#f59e0b",
  "#8b5cf6", "#ec4899", "#64748b", "#EA580C",
  "#06b6d4", "#84cc16",
];

export function CreateCategoryDialog({
  open,
  onOpenChange,
  onSuccess,
  categoryToEdit,
  defaultType,
}: CreateCategoryDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name:  "",
      icon:  "ShoppingCart",
      color: "#10b981",
      type:  "EXPENSE",
    },
  });

  useEffect(() => {
    if (open) {
      if (categoryToEdit) {
        form.reset({
          name:  categoryToEdit.name,
          icon:  categoryToEdit.icon || "ShoppingCart",
          color: categoryToEdit.color || "#10b981",
          type:  categoryToEdit.type.trim() as "INCOME" | "EXPENSE",
        });
      } else {
        form.reset({
          name:  "",
          icon:  "ShoppingCart",
          color: "#10b981",
          type:  defaultType ?? "EXPENSE",
        });
      }
    }
  }, [open, categoryToEdit]);

  async function onSubmit(values: FormValues) {
    if (!user) return;
    setLoading(true);
    try {
      if (categoryToEdit) {
        await updateCategory(categoryToEdit.id, { userId: user.id, ...values });
        toast.success("Categoria atualizada!");
      } else {
        await createCategory({ userId: user.id, ...values });
        toast.success("Categoria criada!");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save category", error);
      toast.error("Erro ao salvar categoria.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-white rounded-3xl border-none shadow-2xl p-8" aria-describedby={undefined}>
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-black text-zinc-900 tracking-tight">
            {categoryToEdit ? "Editar Categoria" : "Nova Categoria"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Nome</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Alimentação, Lazer..."
                      className="h-11 rounded-xl bg-zinc-50 border-zinc-200 focus-visible:ring-emerald-500 font-medium"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium focus:ring-emerald-500">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100">
                      <SelectItem value="INCOME"  className="cursor-pointer">↑ Entrada (Receita)</SelectItem>
                      <SelectItem value="EXPENSE" className="cursor-pointer">↓ Saída (Despesa)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Icon picker — Lucide icons */}
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Ícone</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-8 gap-2 p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
                      {PRESET_ICON_KEYS.map((key) => {
                        const Icon = ICON_MAP[key];
                        const isSelected = field.value === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => field.onChange(key)}
                            title={key}
                            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                              isSelected
                                ? "bg-zinc-900 text-white shadow-md scale-110"
                                : "text-zinc-500 hover:bg-white hover:text-zinc-800 hover:shadow-sm"
                            }`}
                          >
                            <Icon size={16} strokeWidth={1.75} />
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color picker */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Cor</FormLabel>
                  <FormControl>
                    <div className="flex gap-2.5 flex-wrap p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => field.onChange(color)}
                          className={`w-8 h-8 rounded-full cursor-pointer transition-all border-2 border-white ${
                            field.value === color
                              ? "scale-125 shadow-md ring-2 ring-zinc-900"
                              : "hover:scale-110 shadow-sm"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-zinc-900 text-white text-sm font-black shadow-lg hover:bg-zinc-800 transition-all active:scale-[0.98] mt-2"
            >
              {loading ? "Salvando..." : (categoryToEdit ? "Salvar Alterações" : "Criar Categoria")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
