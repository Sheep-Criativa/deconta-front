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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { icon: LayoutDashboard, path: "/dashboard",    label: "Dashboard"    },
  { icon: Building,        path: "/account",      label: "Conta"        },
  { icon: CreditCard,      path: "/cards",        label: "Cartões"      },
  { icon: Users,           path: "/responsibles", label: "Responsáveis" },
  { icon: Tag,             path: "/categories",   label: "Categorias"   },
  { icon: History,         path: "/history",      label: "Histórico"    },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const { pathname } = useLocation();

  const getItemStyles = (path: string) => {
    const isActive = pathname === path;
    return `w-10 h-10 rounded-full flex items-center justify-center transition-all ${
      isActive 
        ? "bg-gray-400 text-white shadow-inner shadow-gray-500" 
        : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
    }`;
  };

  return (
    <aside className="w-16 bg-white rounded-full shadow-md py-6 flex flex-col items-center gap-4 h-fit">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={getItemStyles(item.path)}
          title={item.label}
        >
          <item.icon size={20} />
        </Link>
      ))}

      <div className="flex-1 min-h-[20px]" />

      <button 
        onClick={logout}
        className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
        title="Sair"
      >
        <LogOut size={20} />
      </button>

      {/* <Link
        to="/settings"
        className={getItemStyles("/settings")}
        title="Configurações"
      >
        <Settings size={20} />
      </Link> */}

      <Link
        to="/help"
        className={getItemStyles("/help")}
        title="Ajuda"
      >
        <CircleHelp size={20} />
      </Link>

    </aside>
  );
}
