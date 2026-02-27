import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { type Responsible, getResponsibles, deleteResponsible } from "../services/responsible.service";
import { ResponsibleCard } from "../components/ResponsibleCard";
import { CreateResponsibleDialog } from "../components/CreateResponsibleDialog";
import { toast } from "sonner";

export default function Responsibles() {
  const { user } = useAuth();
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [responsibleToEdit, setResponsibleToEdit] = useState<Responsible | null>(null);

  async function fetchResponsibles() {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getResponsibles(user.id);
      setResponsibles(data);
    } catch (error) {
      console.error("Failed to fetch responsibles", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchResponsibles();
  }, [user]);

  async function handleDelete(id: number) {
    if (!user) return;
    try {
      await deleteResponsible(id, user.id);
      setResponsibles(prev => prev.filter(r => r.id !== id));
      toast.success("Responsável excluído!");
    } catch (error) {
      console.error("Failed to delete responsible", error);
      toast.error("Erro ao excluir. Pode haver transações vinculadas.");
    }
  }

  function handleEdit(responsible: Responsible) {
    setResponsibleToEdit(responsible);
    setIsDialogOpen(true);
  }

  function handleCreate() {
     setResponsibleToEdit(null);
     setIsDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              Responsáveis
           </h1>
           <p className="text-zinc-400 text-sm font-medium mt-0.5">Gerencie as pessoas ou entidades vinculadas às suas transações.</p>
        </div>
         
         <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 px-6 shadow-lg shadow-emerald-600/20 font-bold transition-all active:scale-95">
            <Plus className="mr-2 h-5 w-5" />
            Novo Responsável
         </Button>
      </div>
      
      {loading ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
               <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
         </div>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {responsibles.map((responsible) => (
               <ResponsibleCard 
                  key={responsible.id} 
                  responsible={responsible} 
                  onEdit={handleEdit} 
                  onDelete={handleDelete} 
               />
            ))}
            
            {responsibles.length === 0 && (
               <div className="col-span-full py-12 text-center text-zinc-500 bg-white rounded-2xl border border-dashed border-zinc-200">
                  <p>Nenhum responsável cadastrado.</p>
               </div>
            )}
         </div>
      )}

      <CreateResponsibleDialog 
         open={isDialogOpen} 
         onOpenChange={setIsDialogOpen} 
         onSuccess={fetchResponsibles} 
         responsibleToEdit={responsibleToEdit}
      />
    </div>
  );
}
