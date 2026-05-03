import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, TrendingUp, Receipt } from "lucide-react";

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Parallax for floating elements on scroll
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -100]);

  // Coin exit animation on scroll
  const coinExitX = useTransform(scrollYProgress, [0, 0.8], [0, 1200]);
  const coinExitRotate = useTransform(scrollYProgress, [0, 0.8], [0, 1080]);

  return (
    <section ref={containerRef} className="relative min-h-[95vh] flex items-center justify-center bg-zinc-50 overflow-hidden pt-32 pb-20" id="inicio">
      
      {/* Decorative blurred blobs */}
      <div className="absolute top-[20%] left-[15%] w-[500px] h-[500px] bg-[#00CC73]/20 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob" />
      <div className="absolute top-[30%] right-[15%] w-[500px] h-[500px] bg-[#FBCD25]/20 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob animation-delay-2000" />

      {/* Floating UI Elements (Context for "What the platform does") */}
      <motion.div 
        style={{ y: y1 }}
        initial={{ opacity: 0, x: -50, rotate: -5 }}
        animate={{ opacity: 1, x: 0, rotate: -5 }}
        transition={{ duration: 1, delay: 1 }}
        className="hidden lg:flex absolute left-[5%] bottom-[25%] flex-col gap-3 bg-white/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-zinc-100/50 z-20 hover:rotate-0 transition-transform"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <Receipt size={24} className="text-red-500" />
          </div>
          <div>
            <p className="text-base font-bold text-zinc-900">iFood</p>
            <p className="text-sm text-zinc-500">Alimentação</p>
          </div>
          <p className="ml-6 font-bold text-red-500 text-lg">- R$ 45,90</p>
        </div>
      </motion.div>

      <motion.div 
        style={{ y: y2 }}
        initial={{ opacity: 0, x: 50, rotate: 5 }}
        animate={{ opacity: 1, x: 0, rotate: 5 }}
        transition={{ duration: 1, delay: 1.3 }}
        className="hidden lg:flex absolute right-[2%] top-[20%] flex-col gap-3 bg-white/90 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-zinc-100/50 z-20 hover:rotate-0 transition-transform"
      >
        <div className="flex justify-between items-center gap-12">
           <p className="text-sm text-zinc-500 font-medium">Saldo Atual</p>
           <div className="bg-[#00CC73]/10 text-[#00b365] text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
            <TrendingUp size={14} /> +14%
          </div>
        </div>
        <p className="text-4xl font-black text-zinc-900">R$ 12.450</p>
      </motion.div>

      <div className="relative z-30 max-w-5xl mx-auto px-6 flex flex-col items-center">
        
        {/* Top Badge */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-zinc-200 shadow-sm"
        >
          <span className="flex h-2.5 w-2.5 rounded-full bg-[#00CC73] animate-pulse"></span>
          <span className="text-xs font-bold text-zinc-700 uppercase tracking-widest">A revolução do controle financeiro</span>
        </motion.div>

        {/* Animated Headline - Happens on Mount */}
        <h1 className="text-5xl md:text-7xl lg:text-[80px] font-black text-center text-zinc-900 tracking-tighter leading-[1.05] max-w-[1000px]">
          
          <motion.div 
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8, type: "spring", bounce: 0.5 }}
            className="flex justify-center mb-6"
          >
            <img src="/images/logohorizontal.png" alt="DeConta Logo" className="h-20 object-contain filter drop-shadow-md" />
          </motion.div>

          <div className="flex flex-wrap justify-center items-center">
            <span className="whitespace-nowrap flex items-center">
              <motion.span
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                Dê con
              </motion.span>
              
              <motion.span 
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4, type: "spring", bounce: 0.4 }}
                className="inline-block relative text-zinc-900"
              >
                t
              </motion.span>

              <motion.span
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                a&nbsp;
              </motion.span>
            </span>

            <motion.span
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              do seu dinheiro&nbsp;
            </motion.span>
          </div>
          
          <div className="flex flex-wrap justify-center items-center mt-0 md:mt-2">
            <motion.span
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              sem esforço
            </motion.span>

            <motion.span style={{ x: coinExitX, rotate: coinExitRotate }} className="inline-block origin-center">
              <motion.span
                initial={{ x: -200, y: -200, rotate: -720, opacity: 0, scale: 0 }}
                animate={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, delay: 1, type: "spring", bounce: 0.5 }}
                className="inline-block text-[#FBCD25] origin-center"
              >
                .
              </motion.span>
            </motion.span>
          </div>
        </h1>

        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="mt-8 text-lg md:text-2xl text-zinc-500 font-medium max-w-2xl text-center leading-relaxed"
        >
          Organize suas finanças sem peso e sem complicação. O sistema inteligente que trabalha para você e coloca <strong className="text-zinc-900 font-bold">tudo na sua mão.</strong>
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.6 }}
          className="mt-12 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <button className="group relative px-10 py-5 bg-[#00CC73] hover:bg-[#00b365] text-white rounded-full font-bold text-lg transition-all shadow-[0_8px_30px_rgba(0,204,115,0.3)] hover:shadow-[0_8px_40px_rgba(0,204,115,0.5)] overflow-hidden w-full sm:w-auto">
            <span className="relative z-10 flex items-center justify-center gap-2">
              COMECE JÁ <ArrowUpRight size={22} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
          </button>
          
          <a href="#planos" className="px-10 py-5 bg-white border-2 border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-full font-bold text-lg transition-all w-full sm:w-auto hover:bg-zinc-50 text-center">
            Ver Planos
          </a>
        </motion.div>

        {/* Social Proof */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2 }}
          className="mt-16 flex flex-col sm:flex-row justify-center items-center gap-4 text-sm text-zinc-500 font-medium"
        >
          <div className="flex -space-x-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-zinc-50 bg-zinc-200 overflow-hidden shadow-sm">
                <img src={`https://i.pravatar.cc/100?img=${i + 15}`} alt={`User ${i}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center sm:items-start">
            <div className="flex text-[#FBCD25] text-base gap-[2px]">
              ★★★★★
            </div>
            <p>Junte-se a <strong className="text-zinc-900">10.000+</strong> usuários</p>
          </div>
        </motion.div>
        
      </div>
    </section>
  );
}
