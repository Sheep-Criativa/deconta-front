import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

import { loginUser } from "../services/auth.service";
import { router } from "@/router";

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

export default function Login() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const passwordHash = formData.get("passwordHash") as string;

    if (!email || !passwordHash) {
      setErrors({
        email: "E-mail é obrigatório",
        passwordHash: "Senha é obrigatória",
      });
      return;
    }

    setLoading(true);

    try {
      const data = { email, passwordHash };
      await loginUser(data.email, data.passwordHash);
      console.log("User logged in successfully");
      router.navigate("/");
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "response" in error) {
        const err = error as any;

        if (err.response?.status === 401) {
          setFormError("E-mail ou senha incorretos");
          return;
        }

        const issues = err.response?.data?.issues;
        if (Array.isArray(issues)) {
          const fieldErrors: Record<string, string> = {};

          issues.forEach((issue) => {
            const field = issue.path?.[0];
            if (!field || fieldErrors[field]) return;

            const customMessage =
              zodMessageMap[issue.code]?.(issue) ?? "Campo inválido";

            fieldErrors[field] = customMessage;
          });

          console.log("FIELD ERRORS", fieldErrors);
          setErrors(fieldErrors);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
      {/* BACKGROUND IMAGE */}
      <img
        src="/images/ceu1.png"
        alt="Background"
        className="absolute -z-30 inset-0 w-full h-full object-cover"
      />

      {/* LIGHT SPOTS */}
      <div className="pointer-events-none absolute inset-0">
        {/* Luz superior esquerda */}
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px]
          bg-[radial-gradient(circle_at_center,rgba(255,255,255,1),transparent_60%)]
          blur-[120px]"
        />

        {/* Luz superior direita para esquerda */}
        <div
          className="absolute right-[-200px] w-[700px] h-[900px]
          bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.3),transparent_60%)]
          blur-[140px]"
        />
      </div>

      {/* LEFT SIDE – IMAGE / BRAND */}
      <div className="hidden lg:flex items-center justify-center relative overflow-hidden">
        {/* BRAND LOGO */}
        <div className="absolute top-8 left-8 z-10">
          <img
            src="/images/logoverdical.png"
            alt="DeConta Logo"
            className="w-1/5 h-auto block object-contain leading-none -mt-14 -ml-4"
          />
        </div>

        {/* KEYCHAIN IMAGE */}
        <img
          src="/images/chaveiro.png"
          alt="DeConta Keychain"
          className="relative z-10 w-11/12 h-auto block object-contain leading-none ml-20 mt-6"
        />
      </div>

      {/* RIGHT SIDE – FORM */}
      <div className="flex items-center justify-center px-6 bg-sky-400 lg:bg-transparent">
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
              Acesse sua conta
            </h1>

            <p className="text-lg text-zinc-500 mb-6 leading-relaxed">
              Continue de onde parou. Suas <br /> finanças estão aqui.
            </p>

            {/* FORM */}
            <form className="space-y-5" onSubmit={handleSubmit}>
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
                {loading ? "Entrando..." : "Comece Agora"}
              </Button>
            </form>

            {/* SOCIAL */}
            <div className="mt-8 text-center">
              <p className="text-sm text-zinc-500 mb-4">Ou continue com:</p>

              <div className="flex justify-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-zinc-100" />
                <div className="w-10 h-10 rounded-lg bg-zinc-100" />
                <div className="w-10 h-10 rounded-lg bg-zinc-100" />
              </div>
            </div>

            {/* FOOTER */}
            <p className="mt-8 text-center text-sm text-zinc-500">
              Ainda não tem uma conta?{" "}
              <a
                href="/register"
                className="text-emerald-500 font-semibold hover:underline"
              >
                Criar conta
              </a>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
