import { useState, useEffect } from "react";
import Joyride, { type CallBackProps, STATUS } from 'react-joyride';
import { useAuth } from "@/hooks/useAuth";
import { updateFirstAccess, getMe } from "@/features/auth/services/auth.service";

export function OnboardingTour() {
  const { user, refreshUser } = useAuth();
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const localtourDrawn = localStorage.getItem(`tour_completed_${user.id}`);
    if (localtourDrawn === "true") {
      return; // Já concluído ou pulado nessa máquina, aborta tudo.
    }

    // Only verify with backend if local token claims it's the first access
    if (user.firstAccess === true) {
      let isMounted = true;
      let timer: ReturnType<typeof setTimeout>;

      // Query backend's /auth/me directly to get the most updated state, since JWT might be stale
      getMe().then((dbUser) => {
        if (isMounted && dbUser && dbUser.firstAccess === true) {
          timer = setTimeout(() => {
            setRun(true);
          }, 1000);
        }
      }).catch(err => {
        console.error("Failed to verify firstAccess from DB:", err);
      });

      return () => {
        isMounted = false;
        if (timer) clearTimeout(timer);
      };
    }
  }, [user]);

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      if (user && user.id) {
        // Marca imediatamente no local storage para NUNCA mais rodar neste navegador
        localStorage.setItem(`tour_completed_${user.id}`, "true");
        
        try {
          await updateFirstAccess(user.id, false);
          // Refresh context so firstAccess flag updates
          await refreshUser();
        } catch (error) {
          console.error("Failed to update first access status:", error);
        }
      }
    }
  };

  const steps = [
    {
      target: "#tour-sidebar-dashboard",
      content: "Bem-vindo ao Deconta! Este é o seu painel principal, onde você tem um resumo completo das suas finanças.",
      disableBeacon: true,
    },
    {
      target: "#tour-sidebar-account",
      content: "Aqui você gerencia suas contas correntes, poupanças e investimentos.",
    },
    {
      target: "#tour-sidebar-cards",
      content: "Acompanhe seus cartões de crédito, limites e faturas neste menu.",
    },
    {
      target: "#tour-sidebar-categories",
      content: "Organize suas transações por categorias personalizadas para saber exatamente para onde vai seu dinheiro.",
    },
    {
      target: "#tour-dashboard-balance",
      content: "Neste card você sempre vê o seu saldo total consolidado de todas as contas corporativas e pessoais.",
    },
    {
      target: "#tour-dashboard-flow",
      content: "Acompanhe o fluxo de entradas e saídas ao longo dos últimos meses.",
    },
    {
      target: "#tour-dashboard-recent",
      content: "E por fim, aqui ficam as suas transações mais recentes. Aproveite a plataforma!",
    },
  ];

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={steps}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: '#10b981', // emerald-500
          textColor: '#27272a',    // zinc-800
        },
        buttonClose: {
          display: 'none',
        },
        buttonSkip: {
          color: '#71717a', // zinc-500
        }
      }}
      locale={{
        back: 'Anterior',
        close: 'Fechar',
        last: 'Concluir',
        next: 'Próximo',
        skip: 'Pular',
      }}
    />
  );
}
