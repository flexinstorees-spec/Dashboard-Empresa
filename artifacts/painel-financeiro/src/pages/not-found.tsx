import { AppLayout } from "@/components/layout/app-layout";
import { Link } from "wouter";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <FileQuestion className="h-10 w-10 text-muted-foreground opacity-50" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md">
          A página que você está procurando não existe ou foi movida.
        </p>
        <Link href="/" className="h-10 px-6 flex items-center justify-center bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors">
          Voltar para o Início
        </Link>
      </div>
    </AppLayout>
  );
}
