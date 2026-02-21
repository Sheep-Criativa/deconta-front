import { CreditCard as CardIcon, Wifi } from "lucide-react";

interface CreditCardVisualProps {
  name: string;
  limit: number;
  used: number;
  color?: string;
}

export function CreditCardVisual({ name, limit, used, color = "#10b981" }: CreditCardVisualProps) {
  const available = limit - used;
  const usagePercentage = limit > 0 ? (used / limit) * 100 : 0;

  return (
    <div 
      className="relative w-full max-w-sm aspect-[1.58/1] rounded-[2rem] p-8 text-white shadow-2xl overflow-hidden flex flex-col justify-between"
      style={{ 
        background: `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -40)} 100%)`,
      }}
    >
      {/* Decorative glass elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-12 -mb-12 blur-xl" />

      <div className="flex justify-between items-start z-10">
        <div className="space-y-1">
          <p className="text-white/70 text-xs font-medium uppercase tracking-[0.2em]">Cartão de Crédito</p>
          <h3 className="text-xl font-bold tracking-tight">{name}</h3>
        </div>
        <div className="w-12 h-10 bg-white/10 rounded-lg backdrop-blur-md border border-white/20 flex items-center justify-center">
            <Wifi size={20} className="text-white/80 rotate-90" />
        </div>
      </div>

      <div className="z-10">
        <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest mb-1">Limite Disponível</p>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-medium text-white/80">R$</span>
          <span className="text-3xl font-black tracking-tighter">
            {available.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="space-y-3 z-10">
        <div className="flex justify-between items-end text-[10px] font-bold uppercase tracking-wider text-white/80">
          <span>Uso do Limite</span>
          <span>{usagePercentage.toFixed(0)}%</span>
        </div>
        <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
          <div 
            className="h-full bg-white transition-all duration-1000 ease-out"
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>
      </div>
      
      {/* Chip and logo mockup */}
      <div className="absolute bottom-8 right-8 flex flex-col items-end opacity-40">
         <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center overflow-hidden border border-yellow-200/50">
            <div className="grid grid-cols-2 gap-px w-full h-full opacity-30">
                <div className="border border-white/20"></div>
                <div className="border border-white/20"></div>
                <div className="border border-white/20"></div>
                <div className="border border-white/20"></div>
            </div>
         </div>
      </div>
    </div>
  );
}

// Utility to darken/lighten color
function adjustColor(hex: string, amt: number) {
  let usePound = false;
  if (hex[0] === "#") {
    hex = hex.slice(1);
    usePound = true;
  }
  const num = parseInt(hex, 16);
  let r = (num >> 16) + amt;
  if (r > 255) r = 255; else if (r < 0) r = 0;
  let b = ((num >> 8) & 0x00FF) + amt;
  if (b > 255) b = 255; else if (b < 0) b = 0;
  let g = (num & 0x0000FF) + amt;
  if (g > 255) g = 255; else if (g < 0) g = 0;
  return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);
}
