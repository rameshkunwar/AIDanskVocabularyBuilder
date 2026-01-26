import { NavLink, Outlet } from "react-router-dom";
import { BookOpen, Upload, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-purple-100 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        📚 Danske Ord
                    </h1>
                    <nav className="flex gap-2">
                        <NavItem to="/" icon={<BookOpen className="w-5 h-5" />} label="Øv" />
                        <NavItem
                            to="/upload"
                            icon={<Upload className="w-5 h-5" />}
                            label="Upload"
                        />
                        <NavItem
                            to="/progress"
                            icon={<Trophy className="w-5 h-5" />}
                            label="Fremskridt"
                        />
                    </nav>
                </div>
            </header>

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

interface NavItemProps {
    to: string;
    icon: React.ReactNode;
    label: string;
}

function NavItem({ to, icon, label }: NavItemProps) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-200",
                    isActive
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-300/50"
                        : "text-gray-600 hover:bg-purple-100"
                )
            }
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </NavLink>
    );
}
