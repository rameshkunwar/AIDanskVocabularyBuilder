import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Calendar, ChevronRight, Loader2, FolderPlus, Trash2 } from "lucide-react";
import { getCollections, deleteCollection } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function DashboardPage() {
    const queryClient = useQueryClient();
    const { data: collections = [], isLoading } = useQuery({
        queryKey: ["collections"],
        queryFn: getCollections,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteCollection(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["collections"] });
        },
        onError: (err: Error) => {
            alert(err?.message || "Kunne ikke slette samlingen.");
        },
    });

    const handleDelete = (e: React.MouseEvent, id: number, name: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm(`Er du sikker på, at du vil slette den tomme samling "${name}"?`)) {
            deleteMutation.mutate(id);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                <p className="text-lg text-gray-600">Henter dine samlinger...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                        Dine Samlinger 📚
                    </h1>
                    <p className="text-lg text-gray-600 mt-2">
                        Vælg en samling for at begynde at øve!
                    </p>
                </div>
                <Button
                    variant="primary"
                    size="lg"
                    onClick={() => window.location.href = "/upload"}
                    className="shadow-lg shadow-purple-200"
                >
                    <FolderPlus className="w-5 h-5 mr-2" />
                    Ny Samling / Upload
                </Button>
            </div>

            {collections.length === 0 ? (
                <Card variant="glass" className="py-20 text-center">
                    <div className="max-w-md mx-auto space-y-4">
                        <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <BookOpen className="w-10 h-10 text-purple-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            Ingen samlinger endnu
                        </h2>
                        <p className="text-gray-600">
                            Upload dit første billede for at starte din sprogrejse! 🚀
                        </p>
                        <Button
                            variant="primary"
                            size="lg"
                            className="mt-4"
                            onClick={() => window.location.href = "/upload"}
                        >
                            Upload din første side
                        </Button>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {collections.map((collection) => (
                        <div key={collection.id} className="relative group/card">
                            <Link
                                to={`/practice?collection_id=${collection.id}`}
                                className="block group h-full"
                            >
                                <Card
                                    variant="default"
                                    className="h-full transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-purple-300 relative overflow-hidden flex flex-col justify-between"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <BookOpen className="w-16 h-16 text-purple-600" />
                                    </div>

                                    <div className="p-6 flex flex-col h-full">
                                        <div className="flex items-start justify-between gap-2 mb-4">
                                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                                                {collection.name}
                                            </h3>
                                            {collection.word_count === 0 && (
                                                <button
                                                    onClick={(e) => handleDelete(e, collection.id, collection.name)}
                                                    className="opacity-60 hover:opacity-100 text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-all z-10"
                                                    title="Slet tom samling"
                                                    disabled={deleteMutation.isPending}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="mt-auto space-y-2">
                                            <div className="flex items-center text-sm font-semibold text-purple-600 bg-purple-50 w-fit px-2 py-1 rounded-md mb-2">
                                                <BookOpen className="w-4 h-4 mr-2" />
                                                {collection.word_count} {collection.word_count === 1 ? 'ord' : 'ord'}
                                            </div>
                                            <div className="flex items-center text-sm text-gray-500">
                                                <Calendar className="w-4 h-4 mr-2 text-purple-400" />
                                                Oprettet: {new Date(collection.created_at).toLocaleDateString('da-DK')}
                                            </div>
                                            <div className="flex items-center text-sm text-gray-500">
                                                <Calendar className="w-4 h-4 mr-2 text-pink-400" />
                                                Opdateret: {new Date(collection.updated_at).toLocaleDateString('da-DK')}
                                            </div>
                                        </div>

                                        <div className="mt-6 flex items-center text-purple-600 font-bold group-hover:translate-x-2 transition-transform">
                                            Start øvelse
                                            <ChevronRight className="w-5 h-5 ml-1" />
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
