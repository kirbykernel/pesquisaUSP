import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_LOGO } from "@/const";
import { useBranding } from "@/hooks/useBranding";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, LogIn } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function ParticipantLogin() {
  const [, setLocation] = useLocation();
  const [participantNumber, setParticipantNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const utils = trpc.useUtils();
  
  // Buscar configurações de horário
  const { data: settings, isLoading: settingsLoading } = trpc.settings.getFormatted.useQuery(undefined, {
    staleTime: 0, // Sempre buscar versão mais recente
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  
  // Buscar informações importantes customizáveis
  const { data: importantInfoSettings } = trpc.settings.get.useQuery({ key: "important_info" });
  const { appTitle, researcherLine1, researcherLine2, logoUrl } = useBranding();
  
  console.log('Settings loaded:', settings);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!participantNumber.trim()) {
      toast.error("Digite seu número de identificação");
      return;
    }

    setIsLoading(true);
    try {
      const data = await utils.participants.getByNumber.fetch({ participantNumber: participantNumber.trim() });
      localStorage.setItem("participantId", participantNumber.trim());
      toast.success("Login realizado com sucesso!");
      setLocation("/participant/app");
    } catch (error: any) {
      toast.error(error.message || "Participante não encontrado");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>

        <Card>
          <CardHeader className="text-center">
            {logoUrl && (
              <div className="flex justify-center mb-4">
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="h-24 w-24 object-contain rounded-full shadow-lg"
                  style={{ filter: 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.4))' }}
                />
              </div>
            )}
            <CardTitle className="text-2xl">
              {appTitle}
            </CardTitle>
            <div className="text-sm text-gray-600 mt-2 space-y-0.5">
              <p>{researcherLine1}</p>
              <p>{researcherLine2}</p>
            </div>
            <CardDescription>
              Digite seu número de identificação para acessar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="participantNumber">Número de Identificação</Label>
                <Input
                  id="participantNumber"
                  type="text"
                  placeholder="Ex: P123456789"
                  value={participantNumber}
                  onChange={(e) => setParticipantNumber(e.target.value)}
                  disabled={isLoading}
                  className="text-center text-lg font-mono"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Use o número fornecido pelos pesquisadores
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Entrar
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-semibold mb-2">Informações Importantes:</h4>
              {importantInfoSettings?.value ? (
                <div className="text-xs text-muted-foreground whitespace-pre-line">
                  {importantInfoSettings.value}
                </div>
              ) : (
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Acesso permitido das {settings?.accessStartHour ?? 10}h às {settings?.accessEndHour ?? 18}h{settings?.accessTimeEnabled === false && " (sem restrição durante testes)"}</li>
                  <li>• Duração: 28 dias</li>
                  <li>• Responda diariamente</li>
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
