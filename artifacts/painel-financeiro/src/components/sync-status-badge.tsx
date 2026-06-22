import { useGetSyncStatus, useTriggerSync } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export function SyncStatusBadge({ className, showText = true }: { className?: string; showText?: boolean }) {
  const queryClient = useQueryClient();

  const { data: status, isLoading, refetch } = useGetSyncStatus({
    query: {
      refetchInterval: (query) => {
        const data = query.state.data;
        return data?.status === "syncing" ? 3000 : 30000;
      },
    }
  });

  const { mutate: triggerSync, isPending: isTriggeringSync } = useTriggerSync({
    mutation: {
      onSuccess: () => {
        // Começa a verificar o status a cada 3s enquanto sincroniza
        refetch();
        // Atualiza os dados do painel após a sincronização terminar
        const poll = setInterval(async () => {
          const result = await refetch();
          if (result.data?.status !== "syncing") {
            clearInterval(poll);
            // Invalida todos os dados do painel para recarregar os gráficos e métricas
            queryClient.invalidateQueries();
          }
        }, 3000);
        // Garante que o poll para após 10 minutos no máximo
        setTimeout(() => clearInterval(poll), 10 * 60 * 1000);
      },
    },
  });

  if (isLoading && !status) {
    return <div className="h-6 w-24 animate-pulse bg-muted rounded-full" />;
  }

  const isSyncing = status?.status === "syncing" || isTriggeringSync;
  const isError = status?.status === "error";
  const isSuccess = status?.status === "success";

  function handleRefresh() {
    triggerSync();
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2">
        <Badge 
          variant="outline" 
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-0.5 whitespace-nowrap",
            isSyncing && "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
            isSuccess && !isSyncing && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
            isError && "bg-destructive/10 text-destructive border-destructive/20"
          )}
        >
          {isSyncing ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : isSuccess ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : isError ? (
            <XCircle className="h-3 w-3" />
          ) : (
            <Clock className="h-3 w-3 text-muted-foreground" />
          )}
          
          <span className="text-xs font-medium">
            {isSyncing ? "Sincronizando" : isSuccess ? "Sincronizado" : isError ? "Erro" : "Inativo"}
          </span>
        </Badge>

        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 rounded-full" 
          onClick={handleRefresh}
          disabled={isSyncing}
          title="Sincronizar agora"
        >
          <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
        </Button>
      </div>

      {showText && status?.lastSyncAt && (
        <span className="text-[10px] text-muted-foreground ml-1">
          Última: {formatDateTime(status.lastSyncAt)}
        </span>
      )}
    </div>
  );
}
