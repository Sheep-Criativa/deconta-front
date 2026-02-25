import { createBrowserRouter, Outlet } from "react-router-dom";
import Register from "@/features/auth/pages/Register";
import Login from "@/features/auth/pages/Login";
import DashboardLayout from "@/features/dashboard/layout/DashboardLayout";
import DashboardHome from "@/features/dashboard/pages/DashboardHome";
import Accounts from "@/features/dashboard/pages/Accounts";
import Responsibles from "@/features/dashboard/pages/Responsibles";
import Profile from "@/features/dashboard/pages/Profile";
import Categories from "@/features/dashboard/pages/Categories";
import CreditCards from "@/features/dashboard/pages/CreditCards";
import Transactions from "@/features/dashboard/pages/Transactions";
import StatementDetail from "@/features/dashboard/pages/StatementDetail";
import ReportBug from "@/features/dashboard/pages/ReportBug";
import Help from "@/features/dashboard/pages/Help";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext";

function AuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: "/register", element: <Register /> },
      { path: "/login",    element: <Login /> },

      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { path: "/dashboard",   element: <DashboardHome /> },
              { path: "/account",     element: <Accounts /> },
              { path: "/responsibles",element: <Responsibles /> },
              { path: "/categories",  element: <Categories /> },
              { path: "/cards",       element: <CreditCards /> },
              { path: "/history",     element: <Transactions /> },
              { path: "/profile",     element: <Profile /> },
              { path: "/cards/:cardId/statement/:statementId", element: <StatementDetail /> },
              { path: "/report-bug",  element: <ReportBug /> },
              { path: "/help",        element: <Help /> },
            ],
          },
        ],
      },
    ],
  },
]);

