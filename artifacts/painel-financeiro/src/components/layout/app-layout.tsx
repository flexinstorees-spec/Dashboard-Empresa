import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  TrendingUp, 
  ShoppingBag, 
  BarChart2, 
  Wallet,
  Settings,
  LogOut,
  Menu,
  Megaphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { SyncStatusBadge } from "../sync-status-badge";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/desempenho", label: "Desempenho", icon: TrendingUp },
  { href: "/ofertas", label: "Ofertas", icon: ShoppingBag },
  { href: "/campanhas", label: "Campanhas", icon: Megaphone },
  { href: "/comparacao", label: "Comparação", icon: BarChart2 },
  { href: "/fluxo-de-caixa", label: "Fluxo de Caixa", icon: Wallet },
];

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex min-h-screen w-full flex-col bg-background/50 md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-sidebar md:flex fixed inset-y-0 z-50">
        <div className="flex h-16 items-center border-b px-6">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <div className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center">
              <BarChart2 className="h-4 w-4" />
            </div>
            Painel Financeiro
          </div>
        </div>
        
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid gap-1 px-4">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              const Icon = item.icon;
              
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer",
                      isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="border-t p-4">
          <div className="flex flex-col gap-2">
            <SyncStatusBadge className="w-full justify-start" />
            
            <div className="flex items-center gap-2 mt-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title="Alternar tema"
                className="w-full justify-start gap-3 px-3"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="text-sm font-medium">Tema</span>
              </Button>
            </div>
            
            <Link href="/settings">
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-accent-foreground cursor-pointer mt-1">
                <Settings className="h-4 w-4" />
                Configurações
              </div>
            </Link>
            
            <Link href="/login">
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer">
                <LogOut className="h-4 w-4" />
                Sair
              </div>
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[80vw] sm:w-[350px] flex flex-col p-0">
            <SheetHeader className="p-6 border-b text-left">
              <SheetTitle className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center">
                  <BarChart2 className="h-4 w-4" />
                </div>
                Painel Financeiro
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-auto py-4">
              <nav className="grid gap-1 px-4">
                {navItems.map((item) => {
                  const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                  const Icon = item.icon;
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent cursor-pointer",
                          isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="border-t p-4 flex flex-col gap-2">
              <SyncStatusBadge className="w-full justify-start mb-2" />
              <Link href="/settings">
                <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent text-muted-foreground cursor-pointer">
                  <Settings className="h-4 w-4" />
                  Configurações
                </div>
              </Link>
              <Button 
                variant="ghost" 
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-full justify-start gap-3 px-3 text-muted-foreground"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                Alternar Tema
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 font-bold flex-1">
          Painel Financeiro
        </div>
        <SyncStatusBadge showText={false} />
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 md:pl-72 pb-24 md:pb-8 w-full max-w-[1600px] mx-auto">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 z-40 flex h-16 w-full items-center justify-around border-t bg-background/95 backdrop-blur px-2 md:hidden">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center w-full h-full">
              <div
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full h-full",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
