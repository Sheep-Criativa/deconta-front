import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
}

// Utilizamos o proxy do Vite (/n8n-chat) para não dar erro de CORS rodando em localhost:
const WEBHOOK_URL = "/n8n-chat/webhook-test/chat";

export function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generate a random session ID once per page load to keep conversational memory
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15));

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const toggleChat = () => setIsOpen((prev) => !prev);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !user) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "sendMessage",
          sessionId: sessionId,
          chatInput: userMsg.text,
          userId: user.id
        }),
      });

      if (!response.ok) {
        throw new Error("Erro na comunicação com o assistente");
      }

      const data = await response.json();
      
      // n8n returns the assistant response in data.output or data.text usually.
      const botResponseText = data.output || data.text || data.response || "Mãozinha processou sua solicitação.";

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: botResponseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: "Desculpe, estou com problemas técnicos no momento. Tente novamente mais tarde.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Only render if user is logged in
  if (!user) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9, originLocation: "bottom right" }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-6 w-[380px] h-[550px] max-h-[80vh] bg-white rounded-3xl shadow-2xl border border-zinc-100 flex flex-col overflow-hidden z-[9999] font-sans"
            style={{ transformOrigin: "bottom right" }}
          >
            {/* Header */}
            <div className="bg-emerald-600 text-white p-4 flex items-center justify-between shadow-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">
                  <Bot size={22} className="text-white drop-shadow-sm" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">Mãozinha</h3>
                  <p className="text-[11px] text-emerald-100 flex items-center gap-1.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse shadow-sm" />
                    Assistente DeConta
                  </p>
                </div>
              </div>
              <button
                onClick={toggleChat}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-zinc-50 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-zinc-200">
              {messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 opacity-80 mt-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 shadow-sm border border-emerald-50">
                    <Bot size={32} className="text-emerald-600 drop-shadow-sm" />
                  </div>
                  <h4 className="font-bold text-zinc-800 mb-1.5 text-lg">Olá, {user?.name?.split(" ")[0]}!</h4>
                  <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                    Estou aqui para te ajudar com suas finanças. Você pode me pedir para cadastrar contas, registrar gastos ou gerar relatórios!
                  </p>
                </div>
              )}

              {messages.map((msg) => {
                const isBot = msg.sender === "bot";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 max-w-[85%] ${isBot ? "self-start" : "self-end flex-row-reverse"}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex flex-shrink-0 items-center justify-center shadow-md border border-white/50 ${
                        isBot ? "bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700" : "bg-gradient-to-br from-zinc-700 to-zinc-900 text-white"
                      }`}
                    >
                      {isBot ? <Bot size={14} /> : <User size={14} />}
                    </div>
                    <div className="flex flex-col gap-1 drop-shadow-sm">
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed ${
                          isBot
                            ? "bg-white text-zinc-800 border-zinc-100 rounded-tl-sm ring-1 ring-zinc-900/5"
                            : "bg-emerald-600 text-white shadow-emerald-600/20 rounded-tr-sm ring-1 ring-emerald-500/50"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                      <span className={`text-[9px] font-bold opacity-40 px-1 uppercase tracking-wider ${isBot ? "text-left" : "text-right"}`}>
                        {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </motion.div>
                );
              })}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 max-w-[85%] self-start"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 flex items-center justify-center shadow-md border border-white/50">
                    <Bot size={14} />
                  </div>
                  <div className="px-5 py-3.5 bg-white ring-1 ring-zinc-900/5 shadow-sm rounded-2xl rounded-tl-sm flex items-center gap-1.5 h-[42px]">
                    <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Input Area */}
            <div className="bg-white p-3 border-t border-zinc-100 z-10 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.1)]">
              <form onSubmit={sendMessage} className="relative flex items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Mensagem para Mãozinha..."
                  className="w-full bg-zinc-100/80 rounded-full py-3 pl-5 pr-12 text-sm font-medium text-zinc-800 border border-transparent focus:outline-none focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-zinc-400 placeholder:font-normal"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="absolute right-1.5 w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-emerald-500 hover:scale-105 active:scale-95"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="ml-0.5" />}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-[9999] transition-all duration-300 ${
          isOpen ? "bg-zinc-800 text-white rotate-90" : "bg-emerald-600 text-white shadow-emerald-500/30"
        }`}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </motion.button>
    </>
  );
}
