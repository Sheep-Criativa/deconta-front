import { useState, useEffect } from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      // Normaliza a posição do mouse entre -1 e 1
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = (event.clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="relative min-h-screen grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
      {/* BACKGROUND IMAGE - Parallax Lento */}
      <div 
        className="absolute -z-30 inset-0 w-full h-full"
        style={{
          transform: `translate(${mousePos.x * -10}px, ${mousePos.y * -10}px)`,
          transition: "transform 0.1s ease-out"
        }}
      >
        <img
          src="/images/ceu1.png"
          alt="Background"
          className="w-full h-full object-cover scale-110" // Scale para evitar bordas brancas ao mover
        />
      </div>

      {/* LIGHT SPOTS - Parallax Médio */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px]
          bg-[radial-gradient(circle_at_center,rgba(255,255,255,1),transparent_60%)]
          blur-[120px]"
          style={{
            transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)`,
            transition: "transform 0.1s ease-out"
          }}
        />

        <div
          className="absolute right-[-200px] w-[700px] h-[900px]
          bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.3),transparent_60%)]
          blur-[140px]"
          style={{
            transform: `translate(${mousePos.x * -15}px, ${mousePos.y * -15}px)`,
            transition: "transform 0.1s ease-out"
          }}
        />
      </div>

      {/* LEFT SIDE – IMAGE / BRAND */}
      <div className="hidden lg:flex items-center justify-center relative overflow-hidden">
        {/* BRAND LOGO */}
        <div 
          className="absolute top-8 left-8 z-10"
        >
          <img
            src="/images/logoverdical.png"
            alt="DeConta Logo"
            className="w-1/5 h-auto block object-contain leading-none -mt-14 -ml-4"
          />
        </div>

        {/* KEYCHAIN IMAGE - Parallax Rápido (Mais próximo) */}
        <div
            style={{
            transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)`,
            transition: "transform 0.1s ease-out"
          }}
        >
            <img
            src="/images/chaveiro.png"
            alt="DeConta Keychain"
            className="relative z-10 w-11/12 h-auto block object-contain leading-none ml-20 mt-6"
            />
        </div>
      </div>

      {/* RIGHT SIDE – FORM (Children) */}
      <div className="flex items-center justify-center px-6 bg-sky-400/10 lg:bg-transparent backdrop-blur-sm lg:backdrop-blur-none">
        {children}
      </div>
    </div>
  );
}
