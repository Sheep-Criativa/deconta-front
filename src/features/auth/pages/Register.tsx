import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

import { registerUser } from "../services/auth.service";

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const passwordHash = formData.get("passwordHash") as string;

  try {
    const data = { name, email, passwordHash };
    const response = await registerUser(data);
    console.log("User registered successfully:", response);
  } catch (error) {
    console.error("Error registering user:", error);
  }
}

export default function Register() {
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
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px]
          bg-[radial-gradient(circle_at_center,rgba(255,255,255,1),transparent_60%)]
          blur-[120px]" 
        />

        {/* Luz superior direita para esquerda */}
        <div className="absolute right-[-200px] w-[700px] h-[900px]
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
              Criar conta
            </h1>

            <p className="text-lg text-zinc-500 mb-6 leading-relaxed">
              Acesse suas finanças a qualquer momento <br />
              e mantenha tudo organizado em um só lugar.
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
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-lg bg-emerald-500 text-white text-base font-semibold
                  shadow-xl shadow-emerald-500/20 hover:shadow-emerald-700/30 transition"
              >
                Comece Agora
              </Button>
            </form>

            {/* SOCIAL */}
            <div className="mt-8 text-center">
              <p className="text-sm text-zinc-500 mb-4">
                Ou continue com:
              </p>

              <div className="flex justify-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-zinc-100" />
                <div className="w-10 h-10 rounded-lg bg-zinc-100" />
                <div className="w-10 h-10 rounded-lg bg-zinc-100" />
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
      </div>
    </div>
  );
}
