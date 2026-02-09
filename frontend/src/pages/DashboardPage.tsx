import { useQuery } from "@tanstack/react-query";
import { BookOpen, Calendar, ChevronRight, Loader2, FolderPlus } from "lucide-react";
import { getCollections } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function DashboardPage() {
    const { data: collections = [], isLoading } = useQuery({
        queryKey: ["collections"],
        queryFn: getCollections,
    });

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
                        <Link
                            key={collection.id}
                            to={`/practice?collection_id=${collection.id}`}
                            className="block group"
                        >
                            <Card
                                variant="default"
                                className="h-full transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-purple-300 relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <BookOpen className="w-16 h-16 text-purple-600" />
                                </div>

                                <div className="p-6 flex flex-col h-full">
                                    <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors">
                                        {collection.name}
                                    </h3>

                                    <div className="mt-auto space-y-2">
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
                    ))}
                </div>
            )}
        </div>
    );
}
