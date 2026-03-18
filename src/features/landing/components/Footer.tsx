import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-zinc-900 text-white pt-24 pb-12 rounded-t-[3rem] mt-[-3rem] relative z-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <img src="/images/logohorizontal.png" alt="DeConta" className="h-10" />
            </Link>
            <p className="text-zinc-400 max-w-sm text-lg font-medium leading-relaxed">
              O controle financeiro projetado para quem quer resultados, sem perder tempo com planilhas complexas.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-lg mb-6 text-white">Plataforma</h4>
            <ul className="space-y-4 text-zinc-400 font-medium">
              <li><a href="#recursos" className="hover:text-[#00CC73] transition-colors">Recursos</a></li>
              <li><a href="#planos" className="hover:text-[#00CC73] transition-colors">Planos</a></li>
              <li><Link to="/login" className="hover:text-[#00CC73] transition-colors">Entrar</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-lg mb-6 text-white">Contato</h4>
            <ul className="space-y-4 text-zinc-400 font-medium">
              <li><a href="#" className="hover:text-[#00CC73] transition-colors">Suporte</a></li>
              <li><a href="#" className="hover:text-[#00CC73] transition-colors">Instagram</a></li>
              <li><a href="#" className="hover:text-[#00CC73] transition-colors">LinkedIn</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-zinc-800 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-zinc-500 font-medium">
          <p>© {new Date().getFullYear()} DeConta. Todos os direitos reservados.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
