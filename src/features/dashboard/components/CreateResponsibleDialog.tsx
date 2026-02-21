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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { createResponsible, updateResponsible, type Responsible } from "../services/responsible.service";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres").max(100),
  color: z.string().optional(),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateResponsibleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  responsibleToEdit?: Responsible | null;
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
];

export function CreateResponsibleDialog({
  open,
  onOpenChange,
  onSuccess,
  responsibleToEdit,
}: CreateResponsibleDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      color: "#10b981",
      isActive: true,
    },
  });

  // Reset form when opening or changing edit mode
  useEffect(() => {
    if (open) {
      if (responsibleToEdit) {
        form.reset({
          name: responsibleToEdit.name,
          color: responsibleToEdit.color || "#10b981",
          isActive: responsibleToEdit.isActive,
        });
      } else {
        form.reset({
          name: "",
          color: "#10b981",
          isActive: true,
        });
      }
    }
  }, [open, responsibleToEdit, form]);

  async function onSubmit(values: FormValues) {
    if (!user) return;

    setLoading(true);
    try {
      if (responsibleToEdit) {
        await updateResponsible(responsibleToEdit.id, {
           userId: user.id,
           ...values
        });
        toast.success("Responsável atualizado!");
      } else {
        await createResponsible({
          userId: user.id,
          ...values,
        });
        toast.success("Responsável criado!");
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save responsible", error);
      toast.error("Erro ao salvar responsável.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white rounded-3xl border-none shadow-2xl p-8">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-semibold text-zinc-900">
            {responsibleToEdit ? "Editar Responsável" : "Novo Responsável"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-sm font-semibold text-zinc-800">Nome</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: João, Maria, Empresa X..." 
                      className="h-11 rounded-lg bg-white border-zinc-300 text-zinc-900 focus-visible:ring-emerald-500"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-sm font-semibold text-zinc-800">Cor</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_COLORS.map((color) => (
                        <div
                          key={color}
                          onClick={() => field.onChange(color)}
                          className={`w-8 h-8 rounded-full cursor-pointer transition-all ${
                            field.value === color ? "ring-2 ring-offset-2 ring-emerald-500 scale-110" : "hover:scale-105"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 border-zinc-200">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-semibold text-zinc-800">Ativo</FormLabel>
                   
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-6">
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-11 rounded-lg bg-emerald-500 text-white text-base font-semibold shadow-xl shadow-emerald-500/20 hover:shadow-emerald-700/30 hover:bg-emerald-600 transition-all"
              >
                {loading ? "Salvando..." : (responsibleToEdit ? "Salvar Alterações" : "Criar Responsável")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
