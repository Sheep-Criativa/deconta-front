import { ArrowRight, BarChart3, PieChart, Target, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function FeaturesSection() {
  const cards = [
    {
      title: "Despesas e Receitas",
      description: "Tenha a clareza máxima de cada centavo que entra e sai da sua conta. Classifique e agrupe automaticamente suas despesas.",
      icon: <PieChart size={32} />,
      color: "bg-zinc-900 text-white",
      iconBg: "bg-zinc-800",
      span: "md:col-span-2",
    },
    {
      title: "Metas Inteligentes",
      description: "Planeje seus sonhos e deixe o DeConta ajudar no passo a passo.",
      icon: <Target size={32} />,
      color: "bg-[#00CC73] text-white",
      iconBg: "bg-[#00b365]",
      span: "md:col-span-1",
    },
    {
      title: "Relatórios Visuais",
      description: "Gráficos que você realmente entende, práticos e direto ao ponto.",
      icon: <BarChart3 size={32} />,
      color: "bg-white text-zinc-900 border border-zinc-200 overflow-hidden relative group",
      iconBg: "bg-zinc-100",
      span: "md:col-span-1",
    },
    {
      title: "Integração Ágil",
      description: "Tudo funciona muito rápido, focado no seu tempo. Adicione transações em 1 clique.",
      icon: <Zap size={32} />,
      color: "bg-zinc-900 text-white",
      iconBg: "bg-zinc-800",
      span: "md:col-span-2",
    },
  ];

  return (
    <section className="py-32 bg-white relative overflow-hidden" id="recursos">
      {/* Decorative floating elements inspired by WizardZ reference */}
      <div className="absolute top-20 right-10 w-64 h-64 bg-[#00CC73] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
      <div className="absolute bottom-20 left-10 w-64 h-64 bg-[#FBCD25] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="mb-20">
          <span className="inline-block py-1 px-3 rounded-full bg-[#FBCD25] text-zinc-900 font-bold text-sm mb-4 tracking-wide uppercase">
            Recursos
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tight max-w-2xl leading-tight">
            Suas finanças no controle, simples e sem ficar na mão.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card, i) => (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
              key={i}
              className={`p-10 rounded-[2rem] flex flex-col justify-between ${card.color} ${card.span} transition-transform duration-300 hover:-translate-y-2`}
            >
              <div className="mb-12 flex justify-between items-start">
                <div className={`p-4 rounded-2xl ${card.iconBg} inline-flex`}>
                  {card.icon}
                </div>
                <div className={`w-12 h-12 flex items-center justify-center rounded-full border border-current opacity-50 cursor-pointer transition-colors ${card.color.includes('white') ? 'hover:bg-zinc-900 hover:text-white' : 'hover:bg-white hover:text-zinc-900'}`}>
                  <ArrowRight size={20} />
                </div>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold mb-4">{card.title}</h3>
                <p className="text-lg opacity-80 leading-relaxed font-medium">
                  {card.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
