import { createBrowserRouter, Outlet } from "react-router-dom";
import Register from "@/features/auth/pages/Register";
import Login from "@/features/auth/pages/Login";
import DashboardLayout from "@/features/dashboard/layout/DashboardLayout";
import DashboardHome from "@/features/dashboard/pages/DashboardHome";
import Accounts from "@/features/dashboard/pages/Accounts";
import Responsibles from "@/features/dashboard/pages/Responsibles";
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
      { path: "/login", element: <Login /> },

      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { path: "/dashboard", element: <DashboardHome /> },
              { path: "/account", element: <Accounts /> },
              { path: "/responsibles", element: <Responsibles /> },
            ],
          },
        ],
      },
    ],
  },
]);
