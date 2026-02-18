import { Search, Bell, CircleAlert, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function NavBar() {
  const { user } = useAuth();
  
  // Como o AuthProvider gerencia o loading globalmente agora, 
  // aqui podemos assumir que se o componente renderizou, a auth já foi checada.
  // Mas o user pode ser null se não estiver logado (hipoteticamente, mas ProtectedRoute previne isso)

  return (
    <header className="w-full px-8 py-6 flex items-center justify-between">
      {/* Área esquerda */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <img
          src="/images/simbolo-logo.png"
          alt="Logotipo De Conta"
          className="w-14 ml-1"
        />
        <div className="ml-6">
          <h1 className="text-2xl font-semibold">
            Olá, {user?.name || "usuário"}!
          </h1>
          <p className="text-sm text-zinc-500">
            Bem vindo ao seu painel de controle financeiro!
          </p>
        </div>
      </div>

      {/* Área direita */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <input
            placeholder="Pesquisar..."
            className="w-72 h-10 px-4 rounded-full border border-gray-200 text-sm outline-none"
          />
          <Search className="text-gray-400 absolute right-3 top-2" />
        </div>

        <Bell className="w-6 h-6 text-gray-400 cursor-pointer" />
        <CircleAlert className="w-6 h-6 text-gray-400 cursor-pointer" />

        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm">
          <div className="w-9 h-9 bg-gray-300 rounded-full" />
          <div className="text-sm">
            <p className="font-medium">{user?.name || "usuário"}</p>
            <p className="text-xs text-gray-400">{user?.email || "email@exemplo.com"}</p>
          </div>
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </header>
  );
}
