import { BaseCard } from "../components/BaseCard";

export default function DashboardHome() {
  return (
    <div className="space-y-6">
      {/* GRID SUPERIOR */}
      <div className="grid grid-cols-3 gap-6">
        {/* SALDO TOTAL (maior) */}
        <BaseCard className="col-span-1">
          <p className="text-sm text-zinc-500">Saldo total</p>
          <h2 className="text-2xl font-semibold mt-2">R$ 2.306,20</h2>
          <div className="h-50"></div>
        </BaseCard>

        {/* CARD 2 */}
        <BaseCard>
          <p className="text-sm text-zinc-500">Receita do mês</p>
        </BaseCard>

        {/* CARD 3 */}
        <BaseCard>
          <p className="text-sm text-zinc-500">Despesas do mês</p>
        </BaseCard>
      </div>

      {/* GRID INFERIOR */}
      <div className="grid grid-cols-3 gap-6">
        <div className="grid grid-cols-1 gap-6">
          {/* LIMITE MENSAL */}
          <BaseCard className="col-span-1">
            <p className="text-sm font-medium mb-4">Limite mensal de gastos</p>

            <div className="w-full bg-zinc-200 rounded-full h-3">
              <div className="bg-emerald-500 h-3 rounded-full w-2/3" />
            </div>
          </BaseCard>

          {/* CARTÕES */}
          <BaseCard>
            <div className="flex justify-between mb-4">
              <p className="font-medium">Cartões</p>
              <span className="text-sm text-zinc-500 cursor-pointer bg-gray-200 px-2 py-1 rounded-lg hover:bg-gray-300">
                Adicionar
              </span>
            </div>

            <div className="flex gap-4">
              <div className="w-52 h-32 bg-black rounded-xl" />
              <div className="w-52 h-32 bg-emerald-500 rounded-xl" />
              <div className="w-12 h-32 bg-amber-300 rounded-l-xl"></div>
            </div>
          </BaseCard>
        </div>

        {/* HISTÓRICO (MAIOR) */}
        <BaseCard className="col-span-2">
          <div className="flex justify-between mb-4">
            <p className="font-medium">Histórico de Atividade</p>

            <div className="flex gap-4 text-sm text-zinc-500">
              <span>Buscar...</span>
              <span>Filtrar</span>
            </div>
          </div>

          <div className="bg-zinc-100 rounded-xl h-48" />
        </BaseCard>
      </div>
    </div>
  );
}
