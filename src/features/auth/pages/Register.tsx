import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

import { GoogleLogin } from '@react-oauth/google';

import { registerUser } from "../services/auth.service";
import { AuthLayout } from "../components/AuthLayout";
import { useAuth } from "@/hooks/useAuth";

const registerSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Digite um e-mail válido"),
  passwordHash: z
    .string()
    .min(6, "Senha deve ter no mínimo 6 caracteres")
    .max(100)
    .regex(/[A-Z]/, "Senha deve conter ao menos uma letra maiúscula")
    .regex(/[a-z]/, "Senha deve conter ao menos uma letra minúscula")
    .regex(/[0-9]/, "Senha deve conter ao menos um número")
    .regex(/[^A-Za-z0-9]/, "Senha deve conter ao menos um caractere especial"),
});


const zodMessageMap: Record<string, (issue: any) => string> = {
  too_small: (issue) => {
    if (issue.path[0] === "name") {
      return "O nome deve ter pelo menos 2 caracteres";
    }

    if (issue.path[0] === "passwordHash") {
      return "A senha deve ter no mínimo 6 caracteres";
    }

    return "Campo muito curto";
  },

  invalid_format: (issue) => {
    if (issue.format === "email") {
      return "Digite um e-mail válido";
    }

    if (issue.path[0] === "passwordHash") {
      return "A senha não atende aos critérios de segurança";
    }

    return "Formato inválido";
  },
};

export default function Register() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const passwordHash = formData.get("passwordHash") as string;

    const parseResult = registerSchema.safeParse({ name, email, passwordHash });
    
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      parseResult.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (field && !fieldErrors[field.toString()]) {
          fieldErrors[field.toString()] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    setFormError(null);

    try {
      const data = { name, email, passwordHash };
      await registerUser(data);
      console.log("User registered successfully");
      navigate("/login");
    } catch (error: unknown) {
      setLoading(false);
      if (typeof error === "object" && error !== null && "response" in error) {
        const err = error as {
          response?: {
            data?: {
              issues?: {
                path: string[];
                message: string;
              }[];
            };
          };
        };

        const issues = err.response?.data?.issues;

        if (Array.isArray(issues)) {
          const fieldErrors: Record<string, string> = {};

          issues.forEach((issue) => {
            const field = issue.path?.[0];
            if (!field || fieldErrors[field]) return;

            const customMessage =
              zodMessageMap[issue.code ?? ""]?.(issue) ?? issue.message ?? "Campo inválido";

            fieldErrors[field] = customMessage;
          });

          console.log("FIELD ERRORS", fieldErrors);
          setErrors(fieldErrors);
        }
      }
    }
  }

  return (
    <AuthLayout>
      <Card className="max-w-[730px] bg-white rounded-4xl border-none shadow-2xl px-20 py-16">
        <div className="flex flex-col w-auto">
          {/* ICON */}
          <div className="mb-6">
            <img
              src="/images/simbolo.png"
              alt="Icon"
              className="w-[120px] h-auto block object-contain leading-none -m-10"
            />
          </div>

          {/* TITLE */}
          <h1 className="text-4xl font-semibold text-zinc-900 mb-4">
            Criar conta
          </h1>

          <p className="text-lg text-zinc-500 mb-6 leading-relaxed">
            Acesse suas finanças a qualquer momento <br />e mantenha tudo
            organizado em um só lugar.
          </p>

          {/* FORM */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-zinc-800">
                Nome
              </label>
              <Input
                className="h-11 rounded-lg bg-white border-zinc-300 text-zinc-900"
                name="name"
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-zinc-800">
                E-mail
              </label>
              <Input
                type="email"
                className="h-11 rounded-lg bg-white border-zinc-300 text-zinc-900"
                name="email"
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-zinc-800">
                Senha
              </label>
              <Input
                type="password"
                className="h-11 rounded-lg bg-white border-zinc-300 text-zinc-900"
                name="passwordHash"
              />
              {errors.passwordHash && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.passwordHash}
                </p>
              )}
            </div>

            {formError && (
              <p className="text-sm text-red-600 text-center">{formError}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-emerald-500 text-white text-base font-semibold
                shadow-xl shadow-emerald-500/20 hover:shadow-emerald-700/30 transition"
            >
              {loading ? "Criando..." : "Comece Agora"}
            </Button>
          </form>

          {/* SOCIAL */}
          <div className="mt-8 text-center">
            <p className="text-sm text-zinc-500 mb-4">Ou continue com:</p>

            <div className="flex justify-center">
               <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    if (credentialResponse.credential) {
                      setLoading(true);
                      setFormError(null);
                      try {
                        await loginWithGoogle(credentialResponse.credential);
                      } catch (err: any) {
                        setFormError("Falha na autenticação via Google");
                        setLoading(false);
                      }
                    }
                  }}
                  onError={() => {
                    setFormError("Falha na autenticação via Google");
                  }}
                  shape="rectangular"
                  theme="outline"
                  size="large"
                />
            </div>
          </div>

          {/* FOOTER */}
          <p className="mt-8 text-center text-sm text-zinc-500">
            Já possui uma conta?{" "}
            <a
              href="/login"
              className="text-emerald-500 font-semibold hover:underline"
            >
              Entrar
            </a>
          </p>
        </div>
      </Card>
    </AuthLayout>
  );
}
