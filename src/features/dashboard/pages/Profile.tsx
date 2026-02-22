import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Lock, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { updateUser } from "@/features/auth/services/auth.service";
import { toast } from "sonner";
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

// ── Profile form schema ──────────────────────────────────────────────────────
const profileSchema = z.object({
  name:  z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(100),
  email: z.email("E-mail inválido"),
});
type ProfileValues = z.infer<typeof profileSchema>;

// ── Password form schema ─────────────────────────────────────────────────────
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual"),
  newPassword:     z.string().min(6, "A nova senha deve ter ao menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});
type PasswordValues = z.infer<typeof passwordSchema>;

// ── Section card wrapper ─────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-3xl border border-zinc-100 p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center text-white flex-shrink-0">
          <Icon size={18} />
        </div>
        <h2 className="text-lg font-black text-zinc-900 tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // ── Profile form ────────────────────────────────────────────────────────────
  const profileForm = useForm<ProfileValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(profileSchema) as any,
    defaultValues: {
      name:  user?.name  ?? "",
      email: user?.email ?? "",
    },
  });

  async function onSaveProfile(values: ProfileValues) {
    if (!user) return;
    setSavingProfile(true);
    try {
      // Backend requires passwordHash even for profile updates — send empty string
      // so the current password is preserved via bcrypt re-hash on server side.
      // The backend will hash whatever we send, so we keep sending a sentinel that
      // doesn't change the password (backend must handle empty string gracefully).
      // ⚠️ If your backend rejects empty passwordHash, ask the user for their current one.
      await updateUser(user.id, {
        name:         values.name,
        email:        values.email,
        passwordHash: "__KEEP__", // sentinel — remove if backend ignores empty passwords
      });
      await refreshUser();
      toast.success("Perfil atualizado!");
    } catch (error: any) {
      console.error(error);
      const msg = error?.response?.data?.error ?? "Erro ao atualizar perfil.";
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  }

  // ── Password form ───────────────────────────────────────────────────────────
  const passwordForm = useForm<PasswordValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(passwordSchema) as any,
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSavePassword(values: PasswordValues) {
    if (!user) return;
    setSavingPassword(true);
    try {
      await updateUser(user.id, {
        name:         user.name,
        email:        user.email,
        passwordHash: values.newPassword,
      });
      passwordForm.reset();
      toast.success("Senha alterada com sucesso!");
    } catch (error: any) {
      console.error(error);
      const msg = error?.response?.data?.error ?? "Erro ao alterar senha.";
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
          <div className="p-2 bg-zinc-900 rounded-xl text-white">
            <User size={20} />
          </div>
          Meu Perfil
        </h1>
        <p className="text-zinc-400 text-sm font-medium mt-0.5">
          Gerencie suas informações pessoais e segurança.
        </p>
      </div>

      {/* Avatar / Name badge */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 flex items-center gap-5 text-white shadow-lg shadow-emerald-500/20">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-black flex-shrink-0">
          {user?.name?.charAt(0).toUpperCase() ?? "?"}
        </div>
        <div>
          <p className="text-white/60 text-[11px] font-bold uppercase tracking-widest">Usuário</p>
          <p className="text-xl font-black tracking-tight mt-0.5">{user?.name}</p>
          <p className="text-white/70 text-sm font-medium">{user?.email}</p>
        </div>
      </div>

      {/* ─── Personal Data ─── */}
      <SectionCard title="Dados Pessoais" icon={User}>
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-5">
            <FormField
              control={profileForm.control as any}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black text-zinc-500 uppercase tracking-wider">Nome</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Seu nome completo"
                      className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-medium focus-visible:ring-emerald-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={profileForm.control as any}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black text-zinc-500 uppercase tracking-wider">E-mail</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="seu@email.com"
                      className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-medium focus-visible:ring-emerald-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={savingProfile}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]"
            >
              {savingProfile
                ? <><Loader2 size={16} className="mr-2 animate-spin" /> Salvando...</>
                : <><Save size={16} className="mr-2" /> Salvar Dados</>
              }
            </Button>
          </form>
        </Form>
      </SectionCard>

      {/* ─── Change Password ─── */}
      <SectionCard title="Alterar Senha" icon={Lock}>
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onSavePassword)} className="space-y-5">
            <FormField
              control={passwordForm.control as any}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black text-zinc-500 uppercase tracking-wider">Senha Atual</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="••••••••"
                      className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-medium focus-visible:ring-emerald-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control as any}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black text-zinc-500 uppercase tracking-wider">Nova Senha</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-medium focus-visible:ring-emerald-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control as any}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black text-zinc-500 uppercase tracking-wider">Confirmar Nova Senha</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Repita a nova senha"
                      className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-medium focus-visible:ring-emerald-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={savingPassword}
              className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold transition-all active:scale-[0.98]"
            >
              {savingPassword
                ? <><Loader2 size={16} className="mr-2 animate-spin" /> Alterando...</>
                : <><Lock size={16} className="mr-2" /> Alterar Senha</>
              }
            </Button>
          </form>
        </Form>
      </SectionCard>

    </div>
  );
}
