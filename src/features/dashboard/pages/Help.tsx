import { HelpCircle, ChevronRight, BookOpen, Bug, MessageSquare } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BaseCard } from "@/features/dashboard/components/BaseCard";
import { Link } from "react-router-dom";

export default function Help() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Central de Ajuda</h1>
          <p className="text-zinc-400 text-sm font-medium mt-0.5">Como podemos ajudar você hoje?</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <HelpCircle size={24} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Content (Left) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Quick Start Guide */}
          <BaseCard className="rounded-3xl border border-zinc-100 shadow-none">
            <h3 className="text-sm font-black text-zinc-900 mb-4 flex items-center gap-2">
              <BookOpen size={16} className="text-emerald-500" />
              Guia Rápido
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 hover:border-emerald-200 transition-colors group cursor-pointer">
                <h4 className="font-bold text-zinc-800 mb-1 text-sm">Contas e Cartões</h4>
                <p className="text-xs text-zinc-500 mb-3">Gerencie seus saldos, faturas e limites.</p>
                <div className="flex items-center text-[11px] font-bold text-emerald-600">
                  Aprender mais <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 hover:border-emerald-200 transition-colors group cursor-pointer">
                <h4 className="font-bold text-zinc-800 mb-1 text-sm">Transações</h4>
                <p className="text-xs text-zinc-500 mb-3">Registre suas receitas e despesas facilmente.</p>
                <div className="flex items-center text-[11px] font-bold text-emerald-600">
                  Aprender mais <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </BaseCard>

          {/* FAQ Accordion */}
          <BaseCard className="rounded-3xl border border-zinc-100 shadow-none">
            <h3 className="text-sm font-black text-zinc-900 mb-4 flex items-center gap-2">
              <MessageSquare size={16} className="text-emerald-500" />
              Perguntas Frequentes
            </h3>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-sm font-bold text-zinc-800 hover:text-emerald-600 text-left">
                  Como funciona o fechamento da fatura do cartão?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-zinc-500 leading-relaxed">
                  A fatura do seu cartão de crédito é calculada baseada no "Dia de Fechamento" configurado. 
                  Todas as transações feitas até essa data entram na fatura atual. As transações após o fechamento 
                  entram na próxima fatura.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-sm font-bold text-zinc-800 hover:text-emerald-600 text-left">
                  Como crio uma nova categoria ou responsável?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-zinc-500 leading-relaxed">
                  Você pode criar categorias e responsáveis de duas formas: diretamente nas abas de "Categorias" ou "Responsáveis" 
                  no menu lateral, ou de forma rápida enquanto cadastra uma nova transação clicando em "+ Nova categoria" ou 
                  "+ Novo responsável" abaixo do campo de seleção correspondente.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-sm font-bold text-zinc-800 hover:text-emerald-600 text-left">
                  Como as despesas do cartão afetam meu saldo geral?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-zinc-500 leading-relaxed">
                  As despesas de cartão de crédito afetam o limite disponível do cartão instantaneamente e entram na visualização de fluxo de caixa, 
                  porém só debitam do seu Saldo Total no momento em que você marca a fatura como "Paga" e escolhe a conta de onde o dinheiro saiu.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </BaseCard>
        </div>

        {/* Sidebar (Right) */}
        <div className="lg:col-span-4 space-y-6">
          <BaseCard className="rounded-3xl border border-zinc-100 shadow-none bg-zinc-900 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full" />
            
            <div className="relative z-10 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Bug size={20} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Encontrou um erro?</h3>
                <p className="text-xs text-zinc-400 mt-1 mb-4 leading-relaxed">
                  Nossa equipe está pronta para resolver qualquer problema. Reporte bugs ou sugira melhorias.
                </p>
                <Link to="/report-bug">
                  <button className="w-full bg-white text-zinc-900 hover:bg-zinc-100 font-bold text-xs py-3 rounded-xl transition-colors">
                    Reportar Problema
                  </button>
                </Link>
              </div>
            </div>
          </BaseCard>

          <BaseCard className="rounded-3xl border border-zinc-100 shadow-none">
            <h3 className="text-sm font-black text-zinc-900 mb-2">Ainda precisa de ajuda?</h3>
            <p className="text-xs text-zinc-500 mb-4">
              Entre em contato diretamente com nossa equipe de suporte através do email:
            </p>
            <div className="bg-zinc-50 rounded-xl p-3 text-center border border-zinc-100">
              <a href="mailto:suporte@deconta.com.br" className="text-sm font-bold text-emerald-600 hover:underline">
                suporte@deconta.com.br
              </a>
            </div>
          </BaseCard>
        </div>
      </div>
    </div>
  );
}
