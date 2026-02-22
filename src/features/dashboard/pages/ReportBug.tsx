import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CircleAlert,
  Bug,
  Send,
  Loader2,
  CheckCircle2,
  Monitor,
  Zap,
  Shield,
  HelpCircle,
} from "lucide-react";
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
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────
const bugCategories = [
  { value: "visual",      label: "Problema Visual / Layout",  icon: Monitor,   color: "text-purple-500",  bg: "bg-purple-50"  },
  { value: "funcional",   label: "Funcionalidade Incorreta",  icon: Zap,       color: "text-amber-500",   bg: "bg-amber-50"   },
  { value: "seguranca",   label: "Problema de Segurança",     icon: Shield,    color: "text-red-500",     bg: "bg-red-50"     },
  { value: "desempenho",  label: "Lentidão / Desempenho",     icon: Bug,       color: "text-blue-500",    bg: "bg-blue-50"    },
  { value: "outro",       label: "Outro",                     icon: HelpCircle,color: "text-zinc-500",    bg: "bg-zinc-50"    },
] as const;

const severityOptions = [
  { value: "baixa",    label: "Baixa",    dot: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50"  },
  { value: "media",    label: "Média",    dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50"    },
  { value: "alta",     label: "Alta",     dot: "bg-orange-400",  text: "text-orange-700",  bg: "bg-orange-50"   },
  { value: "critica",  label: "Crítica",  dot: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50"      },
] as const;

// ── Schema ───────────────────────────────────────────────────────────────────
const bugSchema = z.object({
  title:       z.string().min(5, "Título deve ter ao menos 5 caracteres").max(100),
  category:    z.string().min(1, "Selecione uma categoria"),
  severity:    z.string().min(1, "Selecione a severidade"),
  description: z.string().min(20, "Descrição deve ter ao menos 20 caracteres").max(2000),
  steps:       z.string().max(1000).optional(),
  email:       z.string().email("E-mail inválido").optional().or(z.literal("")),
});
type BugValues = z.infer<typeof bugSchema>;

// ── Section Card ─────────────────────────────────────────────────────────────
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

// ── Category Picker ───────────────────────────────────────────────────────────
function CategoryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {bugCategories.map((cat) => {
        const isSelected = value === cat.value;
        return (
          <button
            key={cat.value}
            type="button"
            onClick={() => onChange(cat.value)}
            className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left cursor-pointer ${
              isSelected
                ? "border-zinc-900 bg-zinc-900 text-white shadow-md"
                : "border-zinc-100 bg-white hover:border-zinc-200 hover:bg-zinc-50 text-zinc-700"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-white/20" : cat.bg}`}>
              <cat.icon size={16} className={isSelected ? "text-white" : cat.color} />
            </div>
            <span className={`text-xs font-bold leading-tight ${isSelected ? "text-white" : "text-zinc-700"}`}>
              {cat.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Severity Picker ───────────────────────────────────────────────────────────
function SeverityPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-3 flex-wrap">
      {severityOptions.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all font-bold text-sm cursor-pointer ${
              isSelected
                ? `border-transparent ${opt.bg} ${opt.text} shadow-sm`
                : "border-zinc-100 bg-white text-zinc-500 hover:border-zinc-200"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isSelected ? opt.dot : "bg-zinc-300"}`} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Success Screen ────────────────────────────────────────────────────────────
function SuccessScreen({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-100">
        <CheckCircle2 size={40} className="text-emerald-500" />
      </div>
      <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Relatório Enviado!</h2>
      <p className="text-zinc-400 text-sm font-medium mt-2 max-w-xs">
        Obrigado pelo reporte! Nossa equipe irá analisar o problema e trabalhar em uma solução.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Button
          onClick={onReset}
          className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl h-11 px-6 font-bold transition-all active:scale-95"
        >
          <Bug size={15} className="mr-2" />
          Reportar Outro Problema
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ReportBug() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<BugValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(bugSchema) as any,
    defaultValues: {
      title:       "",
      category:    "",
      severity:    "",
      description: "",
      steps:       "",
      email:       "",
    },
  });

  async function onSubmit(values: BugValues) {
    setSubmitting(true);
    try {
      // Simula envio do report (substitua por chamada real à API)
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log("Bug report:", values);
      toast.success("Relatório enviado com sucesso!");
      setSubmitted(true);
    } catch {
      toast.error("Erro ao enviar relatório. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    form.reset();
    setSubmitted(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
          <div className="p-2 bg-zinc-900 rounded-xl text-white">
            <CircleAlert size={20} />
          </div>
          Reportar Problema
        </h1>
        <p className="text-zinc-400 text-sm font-medium mt-0.5">
          Encontrou algum bug ou comportamento inesperado? Nos conte!
        </p>
      </div>

      {/* ── Info Banner ── */}
      <div className="bg-gradient-to-br from-yellow-500 to-yellow-500 rounded-3xl p-6 flex items-start gap-4 text-white shadow-lg shadow-yellow-500/20">
        <div>
          <p className="text-white/60 text-[11px] font-bold uppercase tracking-widest">
            Sua Contribuição
          </p>
          <p className="text-lg font-black tracking-tight mt-0.5">
            Ajude-nos a melhorar a plataforma
          </p>
          <p className="text-white/70 text-sm font-medium mt-1">
            Cada reporte nos ajuda a entregar uma experiência melhor para todos os usuários.
          </p>
        </div>
      </div>

      {submitted ? (
        <div className="bg-white rounded-3xl border border-zinc-100 p-8 shadow-sm">
          <SuccessScreen onReset={handleReset} />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* ── Informações Básicas ── */}
            <SectionCard title="Informações Básicas" icon={Bug}>
              <div className="space-y-5">

                {/* Título */}
                <FormField
                  control={form.control as any}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black text-zinc-500 uppercase tracking-wider">
                        Título do Problema
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex: Botão de salvar não funciona na tela de transações"
                          className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-medium focus-visible:ring-emerald-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Categoria */}
                <FormField
                  control={form.control as any}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black text-zinc-500 uppercase tracking-wider">
                        Categoria
                      </FormLabel>
                      <FormControl>
                        <CategoryPicker value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Severidade */}
                <FormField
                  control={form.control as any}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black text-zinc-500 uppercase tracking-wider">
                        Severidade
                      </FormLabel>
                      <FormControl>
                        <SeverityPicker value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </SectionCard>

            {/* ── Descrição Detalhada ── */}
            <SectionCard title="Descrição Detalhada" icon={CircleAlert}>
              <div className="space-y-5">

                {/* Descrição */}
                <FormField
                  control={form.control as any}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black text-zinc-500 uppercase tracking-wider">
                        O que aconteceu?
                      </FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          rows={5}
                          placeholder="Descreva o problema com o máximo de detalhes possível. O que você esperava que acontecesse e o que realmente aconteceu?"
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-medium text-zinc-800 placeholder:text-zinc-400 resize-none outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Passos para reproduzir */}
                <FormField
                  control={form.control as any}
                  name="steps"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black text-zinc-500 uppercase tracking-wider">
                        Passos para Reproduzir{" "}
                        <span className="text-zinc-300 font-medium normal-case tracking-normal">(opcional)</span>
                      </FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          rows={4}
                          placeholder={`1. Abrir a página de transações\n2. Clicar no botão "Nova Transação"\n3. Preencher os campos e clicar em Salvar\n4. O erro aparece...`}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-medium text-zinc-800 placeholder:text-zinc-400 resize-none outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* E-mail de contato */}
                <FormField
                  control={form.control as any}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black text-zinc-500 uppercase tracking-wider">
                        E-mail para Contato{" "}
                        <span className="text-zinc-300 font-medium normal-case tracking-normal">(opcional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="seu@email.com — para atualizações sobre este report"
                          className="h-12 rounded-xl border-zinc-200 bg-zinc-50 font-medium focus-visible:ring-emerald-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </SectionCard>

            {/* ── Submit ── */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] text-base"
            >
              {submitting ? (
                <>
                  <Loader2 size={17} className="mr-2 animate-spin" />
                  Enviando relatório...
                </>
              ) : (
                <>
                  <Send size={17} className="mr-2" />
                  Enviar Relatório
                </>
              )}
            </Button>

          </form>
        </Form>
      )}
    </div>
  );
}
