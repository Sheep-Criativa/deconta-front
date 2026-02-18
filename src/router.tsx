import { createBrowserRouter } from "react-router-dom";
import Register from "@/features/auth/pages/Register";
import Login from "@/features/auth/pages/Login";
import DashboardLayout from "@/features/dashboard/layout/DashboardLayout";
import DashboardHome from "@/features/dashboard/pages/DashboardHome";
import ProtectedRoute from "@/components/ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/register", element: <Register /> },
  { path: "/login", element: <Login /> },

  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/dashboard",
        element: <DashboardLayout />,
        children: [{ index: true, element: <DashboardHome /> }],
      },
    ],
  },
]);
