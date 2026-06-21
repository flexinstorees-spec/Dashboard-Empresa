import { AppLayout } from "@/components/layout/app-layout";

export default function Settings() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as preferências da sua conta.
          </p>
        </div>
        
        <div className="max-w-2xl border rounded-lg p-6 bg-card text-card-foreground">
          <h2 className="text-lg font-semibold mb-4">Integração UTMify</h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Token de API</label>
              <input type="password" placeholder="••••••••••••••••" className="h-10 px-3 rounded-md border bg-background" disabled />
              <p className="text-xs text-muted-foreground">Token atual configurado via painel de administração.</p>
            </div>
            <button className="h-10 w-fit px-4 bg-primary text-primary-foreground rounded-md font-medium mt-2 hover:bg-primary/90 transition-colors">
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
