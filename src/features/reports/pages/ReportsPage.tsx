import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ReportsFilterForm, type FormFilterData } from "../components/ReportsFilterForm";
import { CreditCardReportsFilterForm } from "../components/CreditCardReportsFilterForm";
import { ReportTemplate } from "../components/ReportTemplate";
import { BaseCard } from "@/features/dashboard/components/BaseCard";
import { AlertCircle, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { getAccounts, type Account } from "@/features/dashboard/services/account.service";
import { getCategories, type Category } from "@/features/dashboard/services/category.service";
import { getResponsibles, type Responsible } from "@/features/dashboard/services/responsible.service";

import {
  getSummaryReport,
  getByCategoryReport,
  getByResponsibleReport,
  getByAccountReport,
  getDetailedReport,
  downloadPdfReport,
  sendReportByEmail,
  type GetSummaryResponse,
} from "../services/reports.service";

export function ReportsPage() {
  const { user } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);

  // State for the Report Template
  const [currentGroupBy, setCurrentGroupBy] = useState<"none" | "category" | "responsible" | "account">("none");
  const [currentLayoutMode, setCurrentLayoutMode] = useState<"COMPLETE" | "SIMPLE">("COMPLETE");
  const [reportDateRange, setReportDateRange] = useState<string>("");
  const [summaryData, setSummaryData] = useState<GetSummaryResponse | undefined>(undefined);
  const [listData, setListData] = useState<any[] | undefined>(undefined);
  const [hasData, setHasData] = useState(false);
  
  // Current loaded filters
  const [currentFilters, setCurrentFilters] = useState<FormFilterData | null>(null);

  // Email Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailToSend, setEmailToSend] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<"GENERAL" | "CREDIT_CARD">("GENERAL");

  // Load select options
  useEffect(() => {
    if (!user) return;
    Promise.all([
      getAccounts(user.id),
      getCategories(user.id),
      getResponsibles(user.id),
    ]).then(([accs, cats, resps]) => {
      setAccounts(accs.filter(a => a.isActive));
      setCategories(cats);
      setResponsibles(resps.filter(r => r.isActive));
    }).catch(err => {
      console.error("Error loading filters", err);
      toast.error("Erro ao carregar os filtros.");
    }).finally(() => {
      setLoadingInitial(false);
    });
  }, [user]);

  const handleGenerateData = async (filters: FormFilterData) => {
    if (!user) return;
    setLoadingData(true);
    setHasData(false);

    try {
      // 1. Always fetch summary logic:
      const summary = await getSummaryReport(user.id, filters);
      setSummaryData(summary);

      // 2. Fetch Lists Based on group by
      if (filters.groupBy === "category") {
        const data = await getByCategoryReport(user.id, filters);
        setListData(data);
      } else if (filters.groupBy === "responsible") {
        const data = await getByResponsibleReport(user.id, filters);
        setListData(data);
      } else if (filters.groupBy === "account") {
        const data = await getByAccountReport(user.id, filters);
        setListData(data);
      } else {
        const data = await getDetailedReport(user.id, filters);
        setListData(data);
      }

      setCurrentGroupBy(filters.groupBy);
      setCurrentLayoutMode(filters.layoutMode || "COMPLETE");

      // Define text for Date Range display
      if (filters.customDateRangeLabel) {
        setReportDateRange(filters.customDateRangeLabel);
      } else if (filters.startDate && filters.endDate) {
        setReportDateRange(`${format(new Date(filters.startDate + "T12:00:00"), "dd/MM/yyyy")} até ${format(new Date(filters.endDate + "T12:00:00"), "dd/MM/yyyy")}`);
      } else if (filters.startDate) {
        setReportDateRange(`A partir de ${format(new Date(filters.startDate + "T12:00:00"), "dd/MM/yyyy")}`);
      } else if (filters.endDate) {
        setReportDateRange(`Até ${format(new Date(filters.endDate + "T12:00:00"), "dd/MM/yyyy")}`);
      } else {
        setReportDateRange("Período Geral (Todo o histórico)");
      }

      setCurrentFilters(filters);
      setHasData(true);
      toast.success("Dados do relatório carregados com sucesso!");

    } catch (err) {
      console.error("Failed to generate report", err);
      toast.error("Erro ao processar os dados do relatório.");
    } finally {
      setLoadingData(false);
    }
  };

  const handleExportPdf = async () => {
    if (!hasData) {
      toast.error("Gere os dados do relatório primeiro para exportar em PDF.");
      return;
    }

    toast.info("Processando PDF no servidor... Aguarde o download.");

    try {
      const payload = {
        summaryData,
        listData,
        groupBy: currentGroupBy,
        layoutMode: currentLayoutMode,
        reportDateRange,
        userName: user?.name || "Usuário"
      };

      const blob = await downloadPdfReport(user!.id, payload);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `relatorio-deconta-${format(new Date(), "dd-MM-yyyy")}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Download do PDF concluído!");
    } catch (error: any) {
      console.error(error);
      
      // Se a resposta for um Blob (porque configuramos responseType: 'blob'), o Json de erro vem escondido nele
      if (error?.response?.data instanceof Blob) {
        const text = await error.response.data.text();
        try {
          const jsonError = JSON.parse(text);
          toast.error(jsonError.error || "Erro ao gerar PDF no Servidor.");
        } catch {
          toast.error("Erro desconhecido retornado pelo Servidor.");
        }
      } else {
        toast.error("Erro ao gerar PDF no Servidor.");
      }
    }
  };

  // const handleOpenEmailModal = () => {
  //   if (!hasData || !currentFilters) {
  //     toast.error("Gere os dados do relatório primeiro para enviar por e-mail.");
  //     return;
  //   }
  //   setIsEmailModalOpen(true);
  // };

  const handleSendEmailSubmit = async () => {
    if (!user || !emailToSend) return;
    setIsSendingEmail(true);

    try {
      // Garante que amount e total sejam convertidos para número, 
      // caso a API tenha retornado como string (ex: DECIMAL do banco)
      const formattedListData = listData?.map((item: any) => ({
        ...item,
        ...(item.amount !== undefined && { amount: Number(item.amount) }),
        ...(item.total !== undefined && { total: Number(item.total) })
      }));

      const payload = {
        userId: user.id,
        email: emailToSend,
        summaryData: {
          ...summaryData,
          ...(summaryData?.totalIncome !== undefined && { totalIncome: Number(summaryData.totalIncome) }),
          ...(summaryData?.totalExpense !== undefined && { totalExpense: Number(summaryData.totalExpense) }),
          ...(summaryData?.netBalance !== undefined && { netBalance: Number(summaryData.netBalance) }),
        },
        listData: formattedListData,
        groupBy: currentGroupBy,
        layoutMode: currentLayoutMode,
        reportDateRange,
        userName: user?.name || "Usuário"
      };

      await sendReportByEmail(payload);
      toast.success("Relatório enviado com sucesso!");
      setIsEmailModalOpen(false);
      setEmailToSend("");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.error || "Erro ao enviar relatório por e-mail.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex-1 flex flex-col p-4 sm:p-8 min-h-screen bg-zinc-50 items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500 mb-4" size={32} />
        <p className="text-zinc-500 font-medium font-sans">Carregando painel de relatórios...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-zinc-50 min-h-screen p-4 sm:p-8 font-sans w-full max-w-full overflow-hidden">
      
      {/* Header */}
      <div className="mb-8 w-full">
        <h1 className="text-3xl font-black text-zinc-900 tracking-tight leading-none">Relatórios</h1>
        <p className="text-zinc-500 font-medium mt-1">Gere relatórios complexos, aplique filtros e exporte em PDF com 1 clique.</p>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start w-full">
        
        {/* Formulário de Filtros Fixado à esquerda ou em cima (mobile) */}
        <div className="w-full xl:w-[350px] shrink-0 xl:sticky xl:top-[28px] flex flex-col gap-4">
          
          {/* Aba / Tab Switcher */}
          <div className="bg-white p-2 rounded-2xl border border-zinc-100 shadow-sm flex gap-2">
            <button
              onClick={() => setActiveTab("GENERAL")}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === "GENERAL" 
                  ? "bg-emerald-50 text-emerald-600 shadow-sm" 
                  : "text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
              }`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab("CREDIT_CARD")}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === "CREDIT_CARD" 
                  ? "bg-indigo-50 text-indigo-600 shadow-sm" 
                  : "text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
              }`}
            >
              Faturas de Cartão
            </button>
          </div>

          {activeTab === "GENERAL" ? (
            <ReportsFilterForm
              accounts={accounts}
              categories={categories}
              responsibles={responsibles}
              onSubmitFilters={handleGenerateData}
              isLoading={loadingData}
              onExportPdf={handleExportPdf}
              // onSendEmail={handleOpenEmailModal}
            />
          ) : (
            <CreditCardReportsFilterForm
              accounts={accounts}
              categories={categories}
              responsibles={responsibles}
              onSubmitFilters={handleGenerateData}
              isLoading={loadingData}
              onExportPdf={handleExportPdf}
              // onSendEmail={handleOpenEmailModal}
            />
          )}

          {!hasData && !loadingData && (
            <div className="bg-amber-50 text-amber-800 p-4 rounded-2xl border border-amber-200 mt-4 flex gap-3 text-sm font-medium">
              <AlertCircle className="shrink-0" size={18} />
              <p>Configure os filtros acima e clique em "Gerar Dados" para popular a tabela de visualização antes de exportar o PDF.</p>
            </div>
          )}
        </div>

        {/* Componente "Folha A4" com os Dados */}
        <div className="flex-1 w-full bg-transparent overflow-x-auto pb-10">
          <BaseCard className="p-0 border-0 shadow-xl overflow-hidden rounded-md inline-block min-w-[800px] xl:w-full bg-white relative">
            
            {/* Loading Overlay */}
            {loadingData && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-500" size={40} />
              </div>
            )}

            <ReportTemplate
              ref={reportRef}
              reportDateRange={reportDateRange}
              groupBy={currentGroupBy}
              summaryData={summaryData}
              listData={listData}
              layoutMode={currentLayoutMode}
              userFullName={user?.name || "Usuário Deconta"}
            />

          </BaseCard>
        </div>

      </div>

      {/* Email Modal */}
      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle>Enviar Relatório por E-mail</DialogTitle>
            <DialogDescription>
              Informe o endereço de e-mail para o qual deseja enviar este relatório gerado em anexo (PDF).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right font-medium">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="exemplo@email.com"
                className="col-span-3"
                value={emailToSend}
                onChange={(e) => setEmailToSend(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEmailModalOpen(false)}
              disabled={isSendingEmail}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSendEmailSubmit}
              disabled={isSendingEmail || !emailToSend}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar E-mail
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
