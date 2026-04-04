import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import NavBar from "../components/Navbar";
import { ChatWidget } from "../components/ChatWidget";

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      {/* NavBar */}
      <NavBar />

      {/* Main Content */}

      <div className="flex gap-8 px-8 pb-8">

        {/* SideBar */}
        <Sidebar />

        <main className="flex-1">
          <Outlet />
        </main>
        
      </div>

      {/* Chat Widget that floats in the corner */}
      <ChatWidget />
    </div>
  );
}
