import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import NavBar from "../components/Navbar";

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
    </div>
  );
}
