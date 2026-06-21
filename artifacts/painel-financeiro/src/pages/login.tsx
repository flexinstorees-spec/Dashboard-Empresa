import { AppLayout } from "@/components/layout/app-layout";
import { Link } from "wouter";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background/50 p-4">
      <div className="w-full max-w-md p-8 border rounded-2xl bg-card shadow-lg flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Entrar</h1>
          <p className="text-sm text-muted-foreground mt-2">Painel Financeiro via UTMify</p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">E-mail</label>
            <input type="email" placeholder="seu@email.com" className="h-10 px-3 rounded-md border bg-background" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Senha</label>
            <input type="password" placeholder="••••••••" className="h-10 px-3 rounded-md border bg-background" />
          </div>
          <Link href="/" className="h-10 flex items-center justify-center bg-primary text-primary-foreground rounded-md font-medium mt-2 hover:bg-primary/90 transition-colors">
            Acessar Painel
          </Link>
        </div>
      </div>
    </div>
  );
}
