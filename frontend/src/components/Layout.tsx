import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";

export function Layout() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
            <Navbar />

            {/* Main content */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="text-center py-6 text-gray-400 text-sm">
                Lavet med ❤️ til at lære dansk
            </footer>
        </div>
    );
}
