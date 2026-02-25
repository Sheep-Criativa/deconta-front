import { useEffect, useState } from "react";
import { Plus, Tag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { type Category, getCategories, deleteCategory } from "../services/category.service";
import { CategoryCard } from "../components/CategoryCard";
import { CreateCategoryDialog } from "../components/CreateCategoryDialog";
import { toast } from "sonner";

export default function Categories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [filterType, setFilterType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");

  async function fetchCategories() {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getCategories(user.id);
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, [user]);

  async function handleDelete(id: number) {
    if (!user) return;
    try {
      await deleteCategory(id, user.id);
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success("Categoria excluída!");
    } catch (error) {
      console.error("Failed to delete category", error);
      toast.error("Erro ao excluir. Pode haver transações vinculadas.");
    }
  }

  function handleEdit(category: Category) {
    setCategoryToEdit(category);
    setIsDialogOpen(true);
  }

  function handleCreate() {
    setCategoryToEdit(null);
    setIsDialogOpen(true);
  }

  const filteredCategories = categories.filter(cat => 
    filterType === "ALL" ? true : cat.type.trim() === filterType
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
            Categorias
          </h1>
          <p className="text-zinc-400 text-sm font-medium mt-0.5">Organize suas movimentações por tipo e categoria.</p>
        </div>
        
        <Button 
          onClick={handleCreate} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 px-6 shadow-lg shadow-emerald-600/20 font-bold transition-all active:scale-95"
        >
          <Plus className="mr-2 h-5 w-5" />
          Nova Categoria
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-zinc-100 p-1.5 rounded-2xl w-full max-w-md self-start">
        {(["ALL", "INCOME", "EXPENSE"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
              filterType === type 
                ? "bg-white text-zinc-900 shadow-sm" 
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {type === "ALL" ? "Todas" : type === "INCOME" ? "Receitas" : "Despesas"}
          </button>
        ))}
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 bg-white border border-zinc-100 rounded-2xl animate-pulse shadow-sm" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => (
              <CategoryCard 
                key={category.id} 
                category={category} 
                onEdit={handleEdit} 
                onDelete={handleDelete} 
              />
            ))}
          </div>
          
          {filteredCategories.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-3xl border-2 border-dashed border-zinc-100 shadow-sm">
              <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
                <Tag size={32} className="text-zinc-300" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900">Nenhuma categoria encontrada</h3>
              <p className="text-zinc-500 max-w-sm mt-2">
                Comece criando categorias para organizar seus gastos e ganhos de forma eficiente.
              </p>
              <Button onClick={handleCreate} variant="outline" className="mt-6 rounded-xl border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                Criar primeira categoria
              </Button>
            </div>
          )}
        </>
      )}

      <CreateCategoryDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        onSuccess={fetchCategories} 
        categoryToEdit={categoryToEdit}
      />
    </div>
  );
}
