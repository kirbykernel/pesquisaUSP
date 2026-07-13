import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Info, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function AdminSettings() {
  // Configurações de horário de acesso
  const [accessRestrictionEnabled, setAccessRestrictionEnabled] = useState(true);
  const [startHour, setStartHour] = useState(10);
  const [endHour, setEndHour] = useState(18);
  
  // Configuração de tempo de pausa do grupo controle (em minutos)
  const [controlPauseDuration, setControlPauseDuration] = useState(13);
  
  // Informações importantes (página de login)
  const [importantInfo, setImportantInfo] = useState("");
  
  // Branding - Títulos e nomes
  const [appTitle, setAppTitle] = useState("Aplicativo de Pesquisa - Residentes de Medicina");
  const [loginTitle, setLoginTitle] = useState("Ensaio Clínico Randomizado - PAUSA");
  const [researcherLine1, setResearcherLine1] = useState("Prof. PhD Dra. Maria do Patrocínio e Dra Nancy Huang");
  const [researcherLine2, setResearcherLine2] = useState("Dr. João Paulo Costa Braga");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Mutations
  const saveSettingMutation = trpc.settings.set.useMutation();
  
  // Queries
  const { data: accessSettings } = trpc.settings.get.useQuery({ key: "access_hours" });
  const { data: pauseSettings } = trpc.settings.get.useQuery({ key: "control_pause_duration" });
  const { data: importantInfoSettings } = trpc.settings.get.useQuery({ key: "important_info" });
  const { data: appTitleSettings } = trpc.settings.get.useQuery({ key: "app_title" });
  const { data: loginTitleSettings } = trpc.settings.get.useQuery({ key: "login_title" });
  const { data: researcher1Settings } = trpc.settings.get.useQuery({ key: "researcher_line1" });
  const { data: researcher2Settings } = trpc.settings.get.useQuery({ key: "researcher_line2" });
  const { data: logoSettings } = trpc.settings.get.useQuery({ key: "custom_logo_url" });

  // Carregar configurações salvas
  useEffect(() => {
    if (accessSettings?.value) {
      try {
        const parsed = JSON.parse(accessSettings.value);
        setAccessRestrictionEnabled(parsed.enabled ?? true);
        setStartHour(parsed.startHour ?? 10);
        setEndHour(parsed.endHour ?? 18);
      } catch (e) {
        console.error("Error parsing access settings:", e);
      }
    }
  }, [accessSettings]);
  
  useEffect(() => {
    if (pauseSettings?.value) {
      try {
        const minutes = parseInt(pauseSettings.value);
        setControlPauseDuration(minutes || 13);
      } catch (e) {
        console.error("Error parsing pause settings:", e);
      }
    }
  }, [pauseSettings]);
  
  useEffect(() => {
    if (importantInfoSettings?.value) {
      setImportantInfo(importantInfoSettings.value);
    }
  }, [importantInfoSettings]);
  
  useEffect(() => {
    if (appTitleSettings?.value) setAppTitle(appTitleSettings.value);
  }, [appTitleSettings]);
  
  useEffect(() => {
    if (loginTitleSettings?.value) setLoginTitle(loginTitleSettings.value);
  }, [loginTitleSettings]);
  
  useEffect(() => {
    if (researcher1Settings?.value) setResearcherLine1(researcher1Settings.value);
  }, [researcher1Settings]);
  
  useEffect(() => {
    if (researcher2Settings?.value) setResearcherLine2(researcher2Settings.value);
  }, [researcher2Settings]);
  
  useEffect(() => {
    if (logoSettings?.value) setLogoUrl(logoSettings.value);
  }, [logoSettings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 2MB");
      return;
    }

    try {
      setUploadingLogo(true);

      // Converter para base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;

        // Fazer upload via API
        const response = await fetch('/api/upload-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image: base64,
            filename: file.name 
          }),
        });

        if (!response.ok) throw new Error('Erro ao fazer upload');

        const data = await response.json();
        const uploadedUrl = data.url;

        // Salvar URL no banco de dados
        await saveSettingMutation.mutateAsync({
          key: "custom_logo_url",
          value: uploadedUrl,
        });

        setLogoUrl(uploadedUrl);
        toast.success("Logo atualizado com sucesso!");
      };

      reader.onerror = () => {
        throw new Error('Erro ao ler arquivo');
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Erro ao fazer upload do logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveBranding = async () => {
    try {
      await Promise.all([
        saveSettingMutation.mutateAsync({ key: "app_title", value: appTitle }),
        saveSettingMutation.mutateAsync({ key: "login_title", value: loginTitle }),
        saveSettingMutation.mutateAsync({ key: "researcher_line1", value: researcherLine1 }),
        saveSettingMutation.mutateAsync({ key: "researcher_line2", value: researcherLine2 }),
      ]);

      toast.success("Configurações de branding atualizadas com sucesso");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
      console.error(error);
    }
  };

  const handleSaveImportantInfo = async () => {
    try {
      await saveSettingMutation.mutateAsync({
        key: "important_info",
        value: importantInfo,
      });

      toast.success("Informações importantes atualizadas com sucesso");
    } catch (error) {
      toast.error("Erro ao salvar informações");
      console.error(error);
    }
  };

  const handleSavePauseDuration = async () => {
    if (controlPauseDuration < 1 || controlPauseDuration > 60) {
      toast.error("Tempo de pausa deve estar entre 1 e 60 minutos");
      return;
    }

    try {
      await saveSettingMutation.mutateAsync({
        key: "control_pause_duration",
        value: controlPauseDuration.toString(),
      });

      toast.success(`Tempo de pausa do grupo controle configurado para ${controlPauseDuration} minutos`);
    } catch (error) {
      toast.error("Erro ao salvar configuração");
      console.error(error);
    }
  };

  const handleSaveAccessHours = async () => {
    if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
      toast.error("Horas devem estar entre 0 e 23");
      return;
    }

    if (startHour >= endHour) {
      toast.error("Horário de início deve ser menor que horário de fim");
      return;
    }

    try {
      await saveSettingMutation.mutateAsync({
        key: "access_hours",
        value: JSON.stringify({
          enabled: accessRestrictionEnabled,
          startHour,
          endHour,
        }),
      });

      toast.success(
        accessRestrictionEnabled
          ? `Horário de acesso configurado: ${startHour}:00 - ${endHour}:00`
          : "Restrição de horário desabilitada"
      );
    } catch (error) {
      toast.error("Erro ao salvar configurações");
      console.error(error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground mt-1">
            Configure as preferências do sistema
          </p>
        </div>

        {/* Branding - Títulos e Nomes */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-purple-600" />
              <CardTitle>Branding - Títulos e Nomes dos Pesquisadores</CardTitle>
            </div>
            <CardDescription>
              Personalize os títulos e nomes exibidos em todo o aplicativo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload de Logo */}
            <div className="space-y-2">
              <Label htmlFor="logo-upload">Logo Personalizado</Label>
              <div className="flex items-center gap-4">
                {logoUrl && (
                  <img 
                    src={logoUrl} 
                    alt="Logo atual" 
                    className="h-16 w-16 object-contain rounded-lg border"
                  />
                )}
                <div className="flex-1">
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    disabled={uploadingLogo}
                    className="w-full"
                  >
                    {uploadingLogo ? "Fazendo upload..." : logoUrl ? "Alterar Logo" : "Fazer Upload do Logo"}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Imagem PNG, JPG ou SVG. Máximo 2MB. Recomendado: 512x512px
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="app-title">Título do Aplicativo (Header Principal)</Label>
              <Input
                id="app-title"
                value={appTitle}
                onChange={(e) => setAppTitle(e.target.value)}
                placeholder="Aplicativo de Pesquisa - Residentes de Medicina"
              />
              <p className="text-xs text-muted-foreground">
                Aparece no canto superior esquerdo de todas as páginas
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-title">Título da Página de Login</Label>
              <Input
                id="login-title"
                value={loginTitle}
                onChange={(e) => setLoginTitle(e.target.value)}
                placeholder="Ensaio Clínico Randomizado - PAUSA"
              />
              <p className="text-xs text-muted-foreground">
                Título principal exibido na página de login e inicial
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="researcher1">Pesquisadores - Linha 1</Label>
              <Input
                id="researcher1"
                value={researcherLine1}
                onChange={(e) => setResearcherLine1(e.target.value)}
                placeholder="Prof. PhD Dra. Maria do Patrocínio e Dra Nancy Huang"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="researcher2">Pesquisadores - Linha 2</Label>
              <Input
                id="researcher2"
                value={researcherLine2}
                onChange={(e) => setResearcherLine2(e.target.value)}
                placeholder="Dr. João Paulo Costa Braga"
              />
            </div>

            <div className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <Info className="h-5 w-5 text-purple-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-purple-900">
                  Pré-visualização
                </p>
                <div className="text-sm text-purple-800 space-y-1">
                  <p className="font-bold">{loginTitle}</p>
                  <p>{researcherLine1}</p>
                  <p>{researcherLine2}</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSaveBranding} 
              className="w-full"
              disabled={saveSettingMutation.isPending}
            >
              {saveSettingMutation.isPending ? "Salvando..." : "Salvar Configurações de Branding"}
            </Button>
          </CardContent>
        </Card>

        {/* Informações Importantes - Página de Login */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              <CardTitle>Informações Importantes - Página de Login</CardTitle>
            </div>
            <CardDescription>
              Personalize as informações exibidas na página de login para os participantes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="important-info">Texto das Informações</Label>
              <Textarea
                id="important-info"
                value={importantInfo}
                onChange={(e) => setImportantInfo(e.target.value)}
                placeholder="Digite as informações importantes...\n\nExemplo:\n• Acesso permitido das 10h às 20h\n• Duração: 28 dias\n• Responda diariamente"
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Use quebras de linha para separar as informações. Deixe em branco para usar o texto padrão.
              </p>
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">
                  Pré-visualização
                </p>
                <div className="text-sm text-blue-800 whitespace-pre-line">
                  {importantInfo || "(Texto padrão será exibido)"}
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSaveImportantInfo} 
              className="w-full"
              disabled={saveSettingMutation.isPending}
            >
              {saveSettingMutation.isPending ? "Salvando..." : "Salvar Informações"}
            </Button>
          </CardContent>
        </Card>

        {/* Tempo de Pausa - Grupo Controle */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              <CardTitle>Tempo de Pausa - Grupo Controle</CardTitle>
            </div>
            <CardDescription>
              Configure quantos minutos o grupo controle deve aguardar antes de poder responder a segunda escala de bem-estar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pause-duration">Tempo de Pausa (minutos)</Label>
              <Input
                id="pause-duration"
                type="number"
                min="1"
                max="60"
                value={controlPauseDuration}
                onChange={(e) => setControlPauseDuration(parseInt(e.target.value) || 13)}
                placeholder="13"
              />
              <p className="text-sm text-muted-foreground">
                Atualmente: {controlPauseDuration} minutos ({Math.floor(controlPauseDuration / 60) > 0 && `${Math.floor(controlPauseDuration / 60)}h `}{controlPauseDuration % 60}min)
              </p>
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">
                  Como Funciona
                </p>
                <p className="text-sm text-blue-800">
                  O grupo controle precisa aguardar este tempo após iniciar o cronômetro para poder avaliar o bem-estar "DEPOIS" da pausa e enviar a resposta.
                </p>
              </div>
            </div>

            <Button 
              onClick={handleSavePauseDuration} 
              className="w-full"
              disabled={saveSettingMutation.isPending}
            >
              {saveSettingMutation.isPending ? "Salvando..." : "Salvar Tempo de Pausa"}
            </Button>
          </CardContent>
        </Card>

        {/* Horário de Acesso */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <CardTitle>Horário de Acesso</CardTitle>
            </div>
            <CardDescription>
              Configure o horário permitido para os participantes acessarem o aplicativo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="access-restriction" className="text-base font-medium">
                  Restringir Horário de Acesso
                </Label>
                <p className="text-sm text-muted-foreground">
                  {accessRestrictionEnabled 
                    ? "Participantes só podem acessar no horário configurado" 
                    : "Participantes podem acessar a qualquer hora (útil para testes)"}
                </p>
              </div>
              <Switch
                id="access-restriction"
                checked={accessRestrictionEnabled}
                onCheckedChange={setAccessRestrictionEnabled}
              />
            </div>

            {accessRestrictionEnabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-hour">Horário de Início</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="start-hour"
                        type="number"
                        min="0"
                        max="23"
                        value={startHour}
                        onChange={(e) => setStartHour(parseInt(e.target.value) || 0)}
                        placeholder="10"
                      />
                      <span className="text-muted-foreground">:00</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-hour">Horário de Fim</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="end-hour"
                        type="number"
                        min="0"
                        max="23"
                        value={endHour}
                        onChange={(e) => setEndHour(parseInt(e.target.value) || 0)}
                        placeholder="18"
                      />
                      <span className="text-muted-foreground">:00</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Horário configurado: {startHour.toString().padStart(2, '0')}:00 - {endHour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              </>
            )}

            {!accessRestrictionEnabled && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-yellow-900">
                    Modo de Teste Ativado
                  </p>
                  <p className="text-sm text-yellow-800">
                    A restrição de horário está desabilitada. Lembre-se de ativá-la antes de iniciar a pesquisa oficial.
                  </p>
                </div>
              </div>
            )}

            <Button 
              onClick={handleSaveAccessHours} 
              className="w-full"
              disabled={saveSettingMutation.isPending}
            >
              {saveSettingMutation.isPending ? "Salvando..." : "Salvar Configurações de Horário"}
            </Button>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
