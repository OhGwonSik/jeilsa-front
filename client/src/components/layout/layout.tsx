import { useState } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

interface LayoutProps {
    children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50">
            <Header isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex pt-16" style={{ height: "calc( 100vh - 64px )"}}>
                <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                <main className="flex-1 ml-0 md:ml-64 transition-all duration-300">
                    {children}
                </main>
            </div>
        </div>
    );
}
