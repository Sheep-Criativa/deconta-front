import { createContext, useEffect, useState, type ReactNode } from "react";
import { getMe, loginUser, logoutUser, type User } from "@/features/auth/services/auth.service";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, passwordHash: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function checkAuth() {
      try {
        const userData = await getMe();
        
        if (!userData || Object.keys(userData).length === 0) {
          setUser(null);
        } else {
        // Backend return userID, but we map to id for consistency
        const mappedUser = {
          ...userData,
          id: (userData as any).userId || (userData as any).id,
        };
        setUser(mappedUser);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  async function login(email: string, passwordHash: string) {
    try {
      await loginUser(email, passwordHash);
      const userData = await getMe();
      
      if (!userData || Object.keys(userData).length === 0) {
         throw new Error("Falha ao recuperar dados do usuário após login. Resposta vazia.");
      }

      const mappedUser = {
        ...userData,
        id: (userData as any).userId || (userData as any).id,
      };
      setUser(mappedUser);
      navigate("/dashboard");
    } catch (error) {
      console.error("Login ou fetch user falhou", error);
      throw error;
    }
  }

  async function logout() {
    try {
      await logoutUser();
      setUser(null);
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout", error);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
