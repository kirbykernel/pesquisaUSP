import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Upload, Video, Music, FileText, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminContent() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFiles, setAudioFiles] = useState<{ [key: number]: File | null }>({
    1: null,
    2: null,
    3: null,
    4: null,
  });
  const [controlInfo, setControlInfo] = useState("");
  
  // Buscar informação atual do grupo controle
  const { data: currentControlInfo, refetch: refetchControlInfo } = trpc.content.getControlInfo.useQuery(undefined, {
    refetchOnMount: true,
    staleTime: 0,
  });

  const uploadVideoMutation = trpc.content.uploadWelcomeVideo.useMutation({
    onSuccess: () => {
      toast.success("Vídeo de boas-vindas enviado com sucesso!");
      setVideoFile(null);
    },
    onError: (error) => {
      toast.error(`Erro ao enviar vídeo: ${error.message}`);
    },
  });

  const uploadAudioMutation = trpc.content.uploadInterventionAudio.useMutation({
    onSuccess: (_, variables) => {
      toast.success(`Áudio ${variables.audioNumber} enviado com sucesso!`);
      setAudioFiles((prev) => ({ ...prev, [variables.audioNumber]: null }));
    },
    onError: (error) => {
      toast.error(`Erro ao enviar áudio: ${error.message}`);
    },
  });

  const uploadControlInfoMutation = trpc.content.uploadControlInfo.useMutation({
    onSuccess: () => {
      toast.success("Informações do grupo controle salvas com sucesso!");
      setControlInfo("");
      refetchControlInfo(); // Atualizar informação exibida
    },
    onError: (error) => {
      toast.error(`Erro ao salvar informações: ${error.message}`);
    },
  });

  const handleVideoUpload = async () => {
    if (!videoFile) {
      toast.error("Selecione um vídeo");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result?.toString().split(",")[1];
      if (!base64) {
        toast.error("Erro ao processar vídeo");
        return;
      }

      uploadVideoMutation.mutate({
        fileName: videoFile.name,
        fileData: base64,
        mimeType: videoFile.type,
        title: "Vídeo de Boas-Vindas",
      });
    };
    reader.readAsDataURL(videoFile);
  };

  const handleAudioUpload = async (audioNumber: number) => {
    const file = audioFiles[audioNumber];
    if (!file) {
      toast.error("Selecione um áudio");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result?.toString().split(",")[1];
      if (!base64) {
        toast.error("Erro ao processar áudio");
        return;
      }

      uploadAudioMutation.mutate({
        audioNumber,
        fileName: file.name,
        fileData: base64,
        mimeType: file.type,
        title: `Áudio ${audioNumber}`,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleControlInfoSave = () => {
    if (!controlInfo.trim()) {
      toast.error("Digite as informações para o grupo controle");
      return;
    }

    uploadControlInfoMutation.mutate({
      content: controlInfo,
      title: "Informações do Grupo Controle",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Conteúdo</h1>
          <p className="text-muted-foreground mt-1">
            Faça upload dos vídeos, áudios e informações
          </p>
        </div>

        {/* Vídeo de Boas-Vindas */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-blue-600" />
              <CardTitle>Vídeo de Boas-Vindas</CardTitle>
            </div>
            <CardDescription>
              Este vídeo será exibido para todos os participantes (intervenção e controle)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="video">Selecione o vídeo</Label>
              <Input
                id="video"
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button
              onClick={handleVideoUpload}
              disabled={!videoFile || uploadVideoMutation.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploadVideoMutation.isPending ? "Enviando..." : "Enviar Vídeo"}
            </Button>
          </CardContent>
        </Card>

        {/* Áudios de Intervenção */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-purple-600" />
              <CardTitle>Áudios de Intervenção</CardTitle>
            </div>
            <CardDescription>
              4 áudios que serão repetidos ao longo de 28 dias (7 dias cada)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="space-y-2 p-4 border rounded-lg">
                <Label htmlFor={`audio-${num}`}>Áudio {num} (Dias {(num - 1) * 7 + 1}-{num * 7})</Label>
                <div className="flex gap-2">
                  <Input
                    id={`audio-${num}`}
                    type="file"
                    accept="audio/*"
                    onChange={(e) =>
                      setAudioFiles((prev) => ({
                        ...prev,
                        [num]: e.target.files?.[0] || null,
                      }))
                    }
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleAudioUpload(num)}
                    disabled={!audioFiles[num] || uploadAudioMutation.isPending}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Informações do Grupo Controle */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              <CardTitle>Informações do Grupo Controle</CardTitle>
            </div>
            <CardDescription>
              Instruções que serão exibidas diariamente para o grupo controle
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mostrar informação atual salva */}
            {currentControlInfo && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-900 mb-2">Última Informação Salva (Ativa):</p>
                <p className="text-sm text-green-800 whitespace-pre-wrap">{currentControlInfo.fileUrl}</p>
                <p className="text-xs text-green-600 mt-2">
                  Atualizado em: {new Date(currentControlInfo.updatedAt).toLocaleString("pt-BR")}
                </p>
              </div>
            )}
            
            <div>
              <Label htmlFor="control-info">Nova Informação (ou Editar)</Label>
              <Textarea
                id="control-info"
                value={controlInfo}
                onChange={(e) => setControlInfo(e.target.value)}
                placeholder="Digite as informações que os participantes do grupo controle devem ver..."
                rows={8}
              />
            </div>
            <Button
              onClick={handleControlInfoSave}
              disabled={!controlInfo.trim() || uploadControlInfoMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {uploadControlInfoMutation.isPending ? "Salvando..." : "Salvar Informações"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
