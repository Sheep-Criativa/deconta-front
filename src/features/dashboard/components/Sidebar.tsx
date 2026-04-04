import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Building,
  CreditCard,
  Tag,
  History,
  CircleHelp,
  LogOut,
  Users,
  FileText,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { icon: LayoutDashboard, path: "/dashboard",    label: "Dashboard",    id: "tour-sidebar-dashboard" },
  { icon: Building,        path: "/account",      label: "Conta",        id: "tour-sidebar-account" },
  { icon: CreditCard,      path: "/cards",        label: "Cartões",      id: "tour-sidebar-cards" },
  { icon: Users,           path: "/responsibles", label: "Responsáveis", id: "tour-sidebar-responsibles" },
  { icon: Tag,             path: "/categories",   label: "Categorias",   id: "tour-sidebar-categories" },
  { icon: History,         path: "/history",      label: "Transações",    id: "tour-sidebar-history" },
  { icon: FileText,        path: "/reports",      label: "Relatórios",   id: "tour-sidebar-reports" },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <aside 
      className="w-16 hover:w-[210px] flex-shrink-0 bg-white rounded-[32px] shadow-md hover:shadow-xl py-6 flex flex-col transition-all duration-300 ease-in-out group overflow-hidden h-fit"
    >
      <div className="flex flex-col items-start gap-3 w-full px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                id={item.id}
                className={`flex items-center flex-shrink-0 h-10 w-10 group-hover:w-full rounded-full transition-all duration-300 overflow-hidden ${
                  isActive
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30 font-semibold"
                    : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                }`}
                title={!isActive ? item.label : undefined}
              >
                <div className="flex items-center justify-center min-w-[40px] h-10 shrink-0">
                  <item.icon size={20} />
                </div>
                <span className="whitespace-nowrap font-medium text-sm pr-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="flex-1 min-h-[40px]" />

        <div className="flex flex-col items-start gap-3 w-full px-3">
          <button
            onClick={logout}
            className="flex items-center flex-shrink-0 h-10 w-10 group-hover:w-full rounded-full transition-all duration-300 overflow-hidden text-zinc-400 hover:bg-rose-50 hover:text-rose-500"
          >
            <div className="flex items-center justify-center min-w-[40px] h-10 shrink-0">
              <LogOut size={20} />
            </div>
            <span className="whitespace-nowrap font-medium text-sm pr-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
              Sair
            </span>
          </button>

          <Link
            to="/help"
            className={`flex items-center flex-shrink-0 h-10 w-10 group-hover:w-full rounded-full transition-all duration-300 overflow-hidden ${
              pathname === "/help"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30 font-semibold"
                : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            }`}
          >
            <div className="flex items-center justify-center min-w-[40px] h-10 shrink-0">
              <CircleHelp size={20} />
            </div>
            <span className="whitespace-nowrap font-medium text-sm pr-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
              Ajuda
            </span>
          </Link>
      </div>
    </aside>
  );
}
