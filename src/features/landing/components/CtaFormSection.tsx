import { useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle2 } from "lucide-react";

export default function CtaFormSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // Aqui entraria a chamada de API no futuro
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
      setEmail("");
    }
  };

  return (
    <section className="py-32 bg-zinc-900 relative overflow-hidden" id="contato">
      
      {/* Elementos Decorativos de Fundo */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#00CC73]/10 rounded-full mix-blend-screen filter blur-[120px] opacity-50 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#FBCD25]/10 rounded-full mix-blend-screen filter blur-[100px] opacity-40 -translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="bg-zinc-800/50 backdrop-blur-xl border border-zinc-700/50 rounded-[3rem] p-10 md:p-16 text-center shadow-2xl"
        >
          <span className="inline-block py-1 px-3 rounded-full bg-[#00CC73]/20 text-[#00CC73] font-bold text-sm mb-6 tracking-wide uppercase border border-[#00CC73]/30">
            Acesso Antecipado
          </span>
          
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-6">
            Pronto para revolucionar <br className="hidden md:block" /> sua lida com o dinheiro?
          </h2>
          
          <p className="text-lg text-zinc-400 font-medium max-w-2xl mx-auto mb-12">
            Junte-se a milhares de pessoas que já deixaram as planilhas complexas no passado. Assine nossa newsletter e receba dicas de controle financeiro.
          </p>

          <form onSubmit={handleSubmit} className="relative max-w-xl mx-auto flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu melhor e-mail"
                className="w-full h-16 bg-zinc-900/80 border border-zinc-700 text-white px-6 rounded-2xl md:rounded-full focus:outline-none focus:border-[#00CC73] focus:ring-1 focus:ring-[#00CC73] transition-all placeholder:text-zinc-500 font-medium"
                disabled={submitted}
              />
            </div>
            <button
              type="submit"
              disabled={submitted}
              className={`h-16 px-8 rounded-2xl md:rounded-full font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 w-full md:w-auto shadow-lg
                ${submitted 
                  ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed shadow-none' 
                  : 'bg-[#00CC73] hover:bg-[#00b365] text-white hover:shadow-[0_0_30px_rgba(0,204,115,0.4)] hover:-translate-y-1'
                }`}
            >
              {submitted ? (
                <>
                  <CheckCircle2 size={24} className="text-[#00CC73]" />
                  Cadastrado!
                </>
              ) : (
                <>
                  Inscrever-se <Send size={20} />
                </>
              )}
            </button>
          </form>
          
          <p className="mt-6 text-sm text-zinc-500 font-medium">
            Sem spam, prometemos. Cancele sua inscrição quando quiser.
          </p>

        </motion.div>
      </div>
    </section>
  );
}
