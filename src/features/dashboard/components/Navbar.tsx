import { Search, Bell, CircleAlert, ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function NavBar() {
  const { user, logout } = useAuth();
  
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "U";

  return (
    <header className="w-full px-8 py-6 flex items-center justify-between">
      {/* Área esquerda */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <img
          src="/images/simbolo-logo.png"
          alt="Logotipo De Conta"
          className="w-11 ml-2"
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

        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
              <Avatar className="w-9 h-9">
                <AvatarImage src="" />
                <AvatarFallback className="bg-emerald-100 text-emerald-700 font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-sm text-left hidden sm:block">
                <p className="font-medium text-zinc-900">{user?.name || "usuário"}</p>
                <p className="text-xs text-zinc-500">{user?.email || "email@exemplo.com"}</p>
              </div>
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </div>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-56 bg-white">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer hover:bg-gray-50">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 hover:bg-red-50" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
