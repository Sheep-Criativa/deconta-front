import { createBrowserRouter } from "react-router-dom";
import Register from "@/features/auth/pages/Register";

export const router = createBrowserRouter([
  { path: "/register", element: <Register /> },
]);