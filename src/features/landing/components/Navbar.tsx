import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 w-full z-50 transition-colors duration-300 ${
        scrolled ? "bg-white/80 backdrop-blur-md border-b border-zinc-200/50 shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <img src="/images/logohorizontal.png" alt="DeConta" className="h-8 transition-transform duration-300 group-hover:scale-105" />
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600">
          <a href="#inicio" className="hover:text-zinc-900 transition-colors">Início</a>
          <a href="#recursos" className="hover:text-zinc-900 transition-colors">Recursos</a>
          <a href="#planos" className="hover:text-zinc-900 transition-colors">Planos</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="px-6 py-2.5 rounded-full bg-[#00CC73] text-white text-sm font-bold shadow-sm hover:shadow-md hover:bg-[#00b365] transition-all uppercase tracking-wider"
          >
            Entrar
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
