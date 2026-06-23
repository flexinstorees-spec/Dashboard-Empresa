import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "").replace(/^\/painel-financeiro/, "") + "/api";

interface SettingsData {
  utmify_token?: string;
  hasToken?: boolean;
}

interface SyncStatus {
  status: "idle" | "syncing" | "success" | "error";
  lastSyncAt: string | null;
  offersCount: number;
  message: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

export default function Settings() {
  const [token, setToken] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [syncMsg, setSyncMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/sync/status`);
      if (res.ok) {
        const data = await res.json() as SyncStatus;
        setSyncStatus(data);
        return data;
      }
    } catch { /* ignore */ }
    return null;
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then((r) => r.json())
      .then((data: SettingsData) => {
        setHasToken(!!data.hasToken);
      })
      .catch(() => null);

    fetchSyncStatus();
  }, [fetchSyncStatus]);

  // Poll sync status while syncing
  useEffect(() => {
    if (!syncing) return;
    const interval = setInterval(async () => {
      const status = await fetchSyncStatus();
      if (status && status.status !== "syncing") {
        setSyncing(false);
        clearInterval(interval);
        if (status.status === "success") {
          setSyncMsg({ type: "success", text: `✓ ${status.message}` });
        } else if (status.status === "error") {
          setSyncMsg({ type: "error", text: status.message });
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [syncing, fetchSyncStatus]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setSaving(true);
    setSaveMsg(null);
    setSyncMsg(null);
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utmify_token: token }),
      });
      const data = await res.json() as { success?: boolean; error?: string; message?: string };
      if (res.ok && data.success) {
        setSaveMsg({ type: "success", text: "Token salvo com sucesso!" });
        setHasToken(true);
        setToken("");
        // Sync starts automatically on the backend — reflect it here
        setSyncing(true);
        setSyncMsg({ type: "info", text: "Sincronização iniciada automaticamente... Isso pode levar alguns minutos." });
        fetchSyncStatus();
      } else {
        setSaveMsg({ type: "error", text: data.error ?? "Erro ao salvar token." });
      }
    } catch {
      setSaveMsg({ type: "error", text: "Erro de conexão. Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMsg({ type: "info", text: "Sincronização iniciada... Isso pode levar alguns minutos." });
    try {
      await fetch(`${API_BASE}/sync`, { method: "POST" });
      fetchSyncStatus();
    } catch {
      setSyncMsg({ type: "error", text: "Erro de conexão. Tente novamente." });
      setSyncing(false);
    }
  }

  const statusColor = {
    idle: "text-muted-foreground",
    syncing: "text-blue-600 dark:text-blue-400",
    success: "text-emerald-600 dark:text-emerald-400",
    error: "text-destructive",
  };

  const statusLabel = {
    idle: "Nunca sincronizado",
    syncing: "Sincronizando...",
    success: "Sincronizado",
    error: "Erro na última sincronização",
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as preferências da sua conta.
          </p>
        </div>

        {/* Token UTMify */}
        <div className="max-w-2xl border rounded-lg p-6 bg-card text-card-foreground">
          <h2 className="text-lg font-semibold mb-1">Integração UTMify</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Insira seu token de API da UTMify para sincronizar os dados do painel.
            Você pode encontrá-lo em <strong>UTMify → Configurações → API</strong>.
          </p>

          {hasToken && (
            <div className="mb-4 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Token configurado. Digite um novo abaixo para substituí-lo.
            </div>
          )}

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Token de API UTMify</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={hasToken ? "••••••••••••••••  (salvo)" : "Cole seu token aqui"}
                className="h-10 px-3 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {saveMsg && (
              <p className={`text-sm font-medium ${saveMsg.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                {saveMsg.text}
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving || !token.trim()}
                className="h-10 w-fit px-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Salvando..." : "Salvar Token"}
              </button>
              <span className="text-xs text-muted-foreground">
                Ao salvar, a sincronização inicia automaticamente.
              </span>
            </div>
          </form>
        </div>

        {/* Sincronização */}
        <div className="max-w-2xl border rounded-lg p-6 bg-card text-card-foreground">
          <h2 className="text-lg font-semibold mb-1">Sincronização de Dados</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Busca os últimos 90 dias de dados da UTMify e atualiza o painel.
            A sincronização ocorre automaticamente ao salvar o token e todo dia à meia-noite.
            {!hasToken && (
              <span className="text-amber-600 dark:text-amber-400 font-medium"> Configure o token acima primeiro.</span>
            )}
          </p>

          {/* Status da última sincronização */}
          {syncStatus && (
            <div className="mb-4 p-3 rounded-md bg-muted/40 border text-sm flex flex-col gap-1">
              <div className="flex items-center gap-2">
                {syncStatus.status === "syncing" && (
                  <svg className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                )}
                {syncStatus.status === "success" && (
                  <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {syncStatus.status === "error" && (
                  <svg className="w-3.5 h-3.5 text-destructive shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className={`font-medium ${statusColor[syncStatus.status]}`}>
                  {statusLabel[syncStatus.status]}
                </span>
              </div>
              <div className="text-muted-foreground text-xs pl-5">
                {syncStatus.message}
              </div>
              {syncStatus.lastSyncAt && (
                <div className="text-muted-foreground text-xs pl-5">
                  Última execução: {formatDate(syncStatus.lastSyncAt)}
                </div>
              )}
            </div>
          )}

          {syncMsg && (
            <div className={`mb-4 text-sm p-3 rounded-md ${
              syncMsg.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" :
              syncMsg.type === "error" ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" :
              "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
            }`}>
              {syncMsg.text}
            </div>
          )}

          <button
            onClick={handleSync}
            disabled={syncing || !hasToken}
            className="h-10 w-fit px-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {syncing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Sincronizando...
              </>
            ) : "Sincronizar Agora"}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
