import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, Mail, Save, X, Camera, Upload } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { updateUser } from "@/features/auth/services/auth.service";

const profileSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
      });
    }
  }, [user, form]);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "U";

  async function onSubmit(data: ProfileFormValues) {
    if (!user) return;
    setLoading(true);
    setSuccessMessage(null);

    try {
      await updateUser(user.id, data);
      setSuccessMessage("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Failed to update profile", error);
      form.setError("root", { message: "Erro ao atualizar perfil. Tente novamente." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-start justify-center pt-10 min-h-[80vh]">
      <Card className="w-full max-w-4xl border-none shadow-xl bg-white rounded-3xl overflow-hidden relative">
        {/* Close Button Style (visual only since it is a page) */}
        <Link to="/dashboard" className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-600 transition-colors">
          <X size={24} />
        </Link>

        <CardHeader className="px-8 pt-8 pb-2">
          <CardTitle className="text-2xl font-bold text-zinc-800">Editar Perfil</CardTitle>
        </CardHeader>

        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col md:flex-row gap-8">
              
              {/* Left Column: Avatar Upload */}
              <div className="w-full md:w-1/3 flex flex-col items-center justify-center space-y-4">
                <div className="relative group cursor-pointer">
                  <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-emerald-100 text-emerald-600 text-3xl font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 bg-zinc-800 text-white p-2 rounded-full shadow-md hover:bg-zinc-700 transition-colors">
                    <Camera size={16} />
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="font-semibold text-zinc-900">Foto de Perfil</h3>
                  <p className="text-xs text-zinc-500 mt-1">Carregue uma imagem.<br/>Tamanho máx: 1MB</p>
                </div>

                <Button variant="outline" type="button" className="w-full rounded-xl border-dashed border-2 border-zinc-200 hover:bg-zinc-50 hover:border-emerald-500 text-zinc-600">
                    <Upload className="mr-2 h-4 w-4" />
                    Carregar Imagem
                </Button>
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px bg-zinc-200 border-r border-dashed border-zinc-300 mx-4 self-stretch"></div>
              
              {/* Right Column: Form Fields */}
              <div className="flex-1 space-y-6">
                
                <div className="grid grid-cols-1 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                         <FormLabel className="text-zinc-700 font-medium">Nome Completo</FormLabel>
                         <FormControl>
                            <Input {...field} className="h-11 rounded-xl bg-zinc-50 border-zinc-200 focus:bg-white focus:ring-emerald-500 transition-all font-medium text-zinc-800" />
                         </FormControl>
                         <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                         <FormLabel className="text-zinc-700 font-medium">Endereço de Email</FormLabel>
                         <FormControl>
                            <Input {...field} className="h-11 rounded-xl bg-zinc-50 border-zinc-200 focus:bg-white focus:ring-emerald-500 transition-all font-medium text-zinc-800" />
                         </FormControl>
                         <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {successMessage && (
                  <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-100 flex items-center">
                     <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
                     {successMessage}
                  </div>
                )}

                {form.formState.errors.root && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100">
                     {form.formState.errors.root.message}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 mt-auto">
                    <Link to="/dashboard">
                        <Button type="button" variant="ghost" className="rounded-xl h-11 px-6 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100">
                            Cancelar
                        </Button>
                    </Link>
                    <Button 
                        type="submit" 
                        disabled={loading || !form.formState.isDirty}
                        className="rounded-xl h-11 px-8 bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg shadow-zinc-900/10 min-w-[140px]"
                    >
                        {loading ? "Salvando..." : "Salvar"}
                    </Button>
                </div>

              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
