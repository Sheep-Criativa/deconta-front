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

const formSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres").max(100),
  icon: z.string().min(1, "Selecione um ícone"),
  color: z.string().min(1, "Selecione uma cor"),
  type: z.enum(["INCOME", "EXPENSE"]),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  categoryToEdit?: Category | null;
}

const PRESET_COLORS = [
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#64748b", // Slate
  "#EA580C", // Orange
  "#06b6d4", // Cyan
  "#84cc16", // Lime
];

const PRESET_ICONS = [
  "💰", "🛒", "🏠", "🍕", "🚗", "📱", "🏥", "🎓", "🎮", "✈️", 
  "💡", "⛽", "💻", "👕", "🎁", "🍿", "🏋️", "🐾", "🧹", "🌳"
];

export function CreateCategoryDialog({
  open,
  onOpenChange,
  onSuccess,
  categoryToEdit,
}: CreateCategoryDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      icon: "💰",
      color: "#10b981",
      type: "EXPENSE",
    },
  });

  useEffect(() => {
    if (open) {
      if (categoryToEdit) {
        form.reset({
          name: categoryToEdit.name,
          icon: categoryToEdit.icon || "💰",
          color: categoryToEdit.color || "#10b981",
          type: categoryToEdit.type,
        });
      } else {
        form.reset({
          name: "",
          icon: "💰",
          color: "#10b981",
          type: "EXPENSE",
        });
      }
    }
  }, [open, categoryToEdit, form]);

  async function onSubmit(values: FormValues) {
    if (!user) return;

    setLoading(true);
    try {
      if (categoryToEdit) {
        await updateCategory(categoryToEdit.id, {
          userId: user.id,
          ...values,
        });
        toast.success("Categoria atualizada!");
      } else {
        await createCategory({
          userId: user.id,
          ...values,
        });
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
      <DialogContent className="sm:max-w-[480px] bg-white rounded-3xl border-none shadow-2xl p-8">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-bold text-zinc-900">
            {categoryToEdit ? "Editar Categoria" : "Nova Categoria"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel className="text-zinc-700 font-semibold">Nome</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Alimentação, Lazer..." 
                        className="h-11 rounded-xl bg-zinc-50 border-zinc-200 focus:bg-white focus:ring-emerald-500 transition-all font-medium"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel className="text-zinc-700 font-semibold">Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 focus:bg-white focus:ring-emerald-500 transition-all font-medium">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100">
                        <SelectItem value="INCOME" className="cursor-pointer">Entrada (Receita)</SelectItem>
                        <SelectItem value="EXPENSE" className="cursor-pointer">Saída (Despesa)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel className="text-zinc-700 font-semibold text-center block mb-3 text-lg">Ícone</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-5 md:grid-cols-10 gap-2 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        {PRESET_ICONS.map((icon) => (
                          <div
                            key={icon}
                            onClick={() => field.onChange(icon)}
                            className={`w-10 h-10 flex items-center justify-center text-xl cursor-pointer rounded-xl transition-all ${
                              field.value === icon 
                                ? "bg-white shadow-md scale-110 ring-2 ring-emerald-500" 
                                : "hover:bg-white hover:shadow-sm"
                            }`}
                          >
                            {icon}
                          </div>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel className="text-zinc-700 font-semibold">Cor</FormLabel>
                    <FormControl>
                      <div className="flex gap-2 flex-wrap justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        {PRESET_COLORS.map((color) => (
                          <div
                            key={color}
                            onClick={() => field.onChange(color)}
                            className={`w-8 h-8 rounded-full cursor-pointer transition-all border-2 border-white ${
                              field.value === color 
                                ? "scale-125 shadow-md ring-2 ring-emerald-500" 
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
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-12 rounded-xl bg-zinc-900 text-white text-base font-bold shadow-lg shadow-zinc-900/10 hover:bg-zinc-800 transition-all active:scale-[0.98]"
              >
                {loading ? "Salvando..." : (categoryToEdit ? "Salvar Alterações" : "Criar Categoria")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
