import { useGetSyncStatus } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function SyncStatusBadge({ className, showText = true }: { className?: string; showText?: boolean }) {
  const { data: status, isLoading, refetch, isRefetching } = useGetSyncStatus({
    query: {
      refetchInterval: 30000, // 30s
    }
  });

  if (isLoading && !status) {
    return <div className="h-6 w-24 animate-pulse bg-muted rounded-full" />;
  }

  const isSyncing = status?.status === "syncing" || isRefetching;
  const isError = status?.status === "error";
  const isSuccess = status?.status === "success";

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
          onClick={() => refetch()}
          disabled={isSyncing}
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
