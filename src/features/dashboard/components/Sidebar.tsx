import {
  LayoutDashboard,
  CreditCard,
  History,
  Settings,
  CircleQuestionMark,
  LogOut,
} from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="w-15 bg-white rounded-full shadow-md py-6 flex flex-col items-center gap-4">
      <button className="w-8 h-8 rounded-full flex items-center justify-center">
        <LayoutDashboard className="text-gray-400" size={20} />
      </button>

      <button className="w-8 h-8 rounded-full flex items-center justify-center">
        <CreditCard className="text-gray-400" size={20} />
      </button>

      <button className="w-8 h-8 rounded-full flex items-center justify-center">
        <History className="text-gray-400" size={20} />
      </button>

      <button className="w-8 h-8 rounded-full flex items-center justify-center">
        <CreditCard className="text-gray-400" size={20} />
      </button>

      <button className="w-8 h-8 rounded-full flex items-center justify-center">
        <History className="text-gray-400" size={20} />
      </button>

      <div className="flex-1" />

      <button className="w-8 h-8 rounded-full flex items-center justify-center">
        <LogOut className="text-gray-400" size={20} />
      </button>

      <button className="w-8 h-8 rounded-full flex items-center justify-center">
        <Settings className="text-gray-400" size={20} />
      </button>

      <button className="w-8 h-8 rounded-full flex items-center justify-center">
        <CircleQuestionMark className="text-gray-400" size={20} />
      </button>
    </aside>
  );
}
