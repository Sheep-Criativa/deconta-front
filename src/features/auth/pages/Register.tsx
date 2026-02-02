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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-sky-400">
      {/* LEFT SIDE – IMAGE / BRAND */}
      <div className="hidden lg:flex items-center justify-center relative overflow-hidden">
        {/* BACKGROUND IMAGE */}
        <img
          src="/images/bg-register.png" // 🔹 imagem de fundo (céu)
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* BRAND LOGO */}
        <div className="absolute top-8 left-8 z-10 text-white font-semibold text-xl">
          DeConta
        </div>

        {/* KEYCHAIN IMAGE */}
        <img
          src="/images/keychain.png" // 🔹 imagem do chaveiro
          alt="DeConta Keychain"
          className="relative z-10 max-w-[420px] drop-shadow-2xl"
        />
      </div>

      {/* RIGHT SIDE – FORM */}
      <div className="flex items-center justify-center px-6 py-10 bg-sky-400 lg:bg-transparent">
        <Card className="max-w-[730px] bg-white rounded-4xl border-none shadow-2xl px-20 py-15">
        {/* DIV para o conteudo */}
            <div className="flex flex-col w-full max-w-150">
          {/* ICON */}
          <div className="w-12 h-12 rounded-xl bg-yellow-400 flex items-center justify-center mb-6">
            <img
              src="/images/icon-register.png" // 🔹 ícone do topo
              alt="Icon"
              className="w-6 h-6"
            />
          </div>

          {/* TITLE */}
          <h1 className="text-4xl font-semibold text-zinc-900 mb-2">
            Criar conta
          </h1>

          <p className="text-lg text-zinc-500 mb-8 leading-relaxed">
            Acesse suas finanças a qualquer momento <br /> e mantenha tudo
            organizado em um só lugar.
          </p>

          {/* FORM */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-zinc-800">
                Nome
              </label>
              <Input
                placeholder=""
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
                placeholder=""
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
                placeholder=""
                className="h-11 rounded-lg bg-white border-zinc-300 text-zinc-900"
                name="passwordHash"
              />
            </div>

            {/* SUBMIT */}
            <Button
              type="submit"
              className="w-full h-11 rounded-lg bg-emerald-500 text-white text-base font-semibold shadow-xl shadow-green-500/20 hover:shadow-emerald-700/30 transition"
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
