// src/app/(app)/layout.tsx
import { AppProvider } from "@/context/AppContext";
import { Header } from "@/components/Header"; // Import the Header component

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <Header /> {/* Add the Header component here */}
      {children}
    </AppProvider>
  );
}
