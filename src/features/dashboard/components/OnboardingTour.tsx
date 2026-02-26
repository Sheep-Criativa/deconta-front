import { useState, useEffect } from "react";
import { Steps } from "intro.js-react";
import "intro.js/introjs.css";
import { useAuth } from "@/hooks/useAuth";
import { updateFirstAccess } from "@/features/auth/services/auth.service";

export function OnboardingTour() {
  const { user, refreshUser } = useAuth();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Only run tour if user exists and firstAccess is strictly true
    if (user && user.firstAccess === true) {
      // Small timeout to allow DOM to render before attaching tooltips
      const timer = setTimeout(() => {
        setEnabled(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const onExit = async () => {
    setEnabled(false);
    if (user && user.id) {
      try {
        await updateFirstAccess(user.id, false);
        // Refresh context so firstAccess flag updates
        await refreshUser();
      } catch (error) {
        console.error("Failed to update first access status:", error);
      }
    }
  };

  const steps = [
    {
      element: "#tour-sidebar-dashboard",
      intro: "Bem-vindo ao Deconta! Este é o seu painel principal, onde você tem um resumo completo das suas finanças.",
      position: "right",
    },
    {
      element: "#tour-sidebar-account",
      intro: "Aqui você gerencia suas contas correntes, poupanças e investimentos.",
      position: "right",
    },
    {
      element: "#tour-sidebar-cards",
      intro: "Acompanhe seus cartões de crédito, limites e faturas neste menu.",
      position: "right",
    },
    {
      element: "#tour-sidebar-categories",
      intro: "Organize suas transações por categorias personalizadas para saber exatamente para onde vai seu dinheiro.",
      position: "right",
    },
    {
      element: "#tour-dashboard-balance",
      intro: "Neste card você sempre vê o seu saldo total consolidado de todas as contas corporativas e pessoais.",
      position: "bottom",
    },
    {
      element: "#tour-dashboard-flow",
      intro: "Acompanhe o fluxo de entradas e saídas ao longo dos últimos meses.",
      position: "top",
    },
    {
      element: "#tour-dashboard-recent",
      intro: "E por fim, aqui ficam as suas transações mais recentes. Aproveite a plataforma!",
      position: "top",
    },
  ];

  return (
    <Steps
      enabled={enabled}
      steps={steps}
      initialStep={0}
      onExit={onExit}
      options={{
        showProgress: true,
        showBullets: false,
        exitOnOverlayClick: false,
        exitOnEsc: false,
        nextLabel: "Próximo",
        prevLabel: "Anterior",
        doneLabel: "Concluir",
      }}
    />
  );
}
