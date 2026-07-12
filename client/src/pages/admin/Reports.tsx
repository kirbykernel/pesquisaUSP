import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Download, FileSpreadsheet, Users, Activity, Headphones, Package, BarChart2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function AdminReports() {
  const { data: participants } = trpc.participants.list.useQuery();
  const { data: responses } = trpc.responses.getAll.useQuery();
  const { data: audioProgress } = trpc.audioProgress.getAll.useQuery();
  const [spssLoading, setSpssLoading] = useState(false);
  const [spssGroupLoading, setSpssGroupLoading] = useState<"intervention" | "control" | null>(null);

  // Estatísticas rápidas
  const stats = {
    totalParticipants: participants?.length || 0,
    totalResponses: responses?.length || 0,
    totalAudioProgress: audioProgress?.length || 0,
    interventionCount: participants?.filter(p => p.group === "intervention").length || 0,
    controlCount: participants?.filter(p => p.group === "control").length || 0,
  };

  // ─── CSV helpers ──────────────────────────────────────────────────────────

  const handleExportResponses = () => {
    if (!responses || responses.length === 0) {
      toast.error("Não há respostas para exportar");
      return;
    }

    const csv = [
      ["ID Participante", "Número Participante", "Grupo", "Dia", "Bem-Estar ANTES (1-5)", "Bem-Estar DEPOIS (1-5)", "Duração Pausa (min)", "Atividade Atual", "Data/Hora"],
      ...responses.map((r) => {
        const participant = participants?.find(p => p.id === r.participantId);
        return [
          r.participantId,
          participant?.participantNumber || "N/A",
          participant?.group === "intervention" ? "Intervenção" : "Controle",
          r.dayNumber,
          r.wellbeingBefore,
          r.wellbeingAfter || "N/A",
          r.pauseDuration ? Math.floor(r.pauseDuration / 60) : "N/A",
          r.currentActivity || "",
          new Date(r.responseDate).toLocaleString("pt-BR"),
        ];
      }),
    ]
      .map((row) => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `respostas_diarias_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Respostas exportadas com sucesso!");
  };

  const handleExportAudioProgress = () => {
    if (!audioProgress || audioProgress.length === 0) {
      toast.error("Não há progresso de áudios para exportar");
      return;
    }

    const csv = [
      ["ID Participante", "Número Participante", "Áudio", "Dia", "% Escutado", "Completado", "Última Posição (s)", "Data/Hora"],
      ...audioProgress.map((a) => {
        const participant = participants?.find(p => p.id === a.participantId);
        return [
          a.participantId,
          participant?.participantNumber || "N/A",
          a.audioNumber,
          a.dayNumber,
          a.percentageListened,
          a.completed ? "Sim" : "Não",
          a.lastPosition,
          new Date(a.accessDate).toLocaleString("pt-BR"),
        ];
      }),
    ]
      .map((row) => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `progresso_audios_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Progresso de áudios exportado com sucesso!");
  };

  const handleExportByGroup = (group: "intervention" | "control") => {
    const groupParticipants = participants?.filter(p => p.group === group) || [];
    const groupResponses = responses?.filter(r =>
      groupParticipants.some(p => p.id === r.participantId)
    ) || [];

    if (groupResponses.length === 0) {
      toast.error(`Não há respostas do grupo ${group === "intervention" ? "intervenção" : "controle"}`);
      return;
    }

    const csv = [
      ["ID Participante", "Número Participante", "Dia", "Bem-Estar ANTES (1-5)", "Bem-Estar DEPOIS (1-5)", "Duração Pausa (min)", "Atividade Atual", "Data/Hora"],
      ...groupResponses.map((r) => {
        const participant = participants?.find(p => p.id === r.participantId);
        return [
          r.participantId,
          participant?.participantNumber || "N/A",
          r.dayNumber,
          r.wellbeingBefore,
          r.wellbeingAfter || "N/A",
          r.pauseDuration ? Math.floor(r.pauseDuration / 60) : "N/A",
          r.currentActivity || "",
          new Date(r.responseDate).toLocaleString("pt-BR"),
        ];
      }),
    ]
      .map((row) => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const groupName = group === "intervention" ? "intervencao" : "controle";
    link.download = `respostas_${groupName}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success(`Respostas do grupo ${group === "intervention" ? "intervenção" : "controle"} exportadas!`);
  };

  const handleExportComplete = () => {
    if (!participants || participants.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const sections: string[] = [];

    sections.push("=== PARTICIPANTES ===");
    sections.push(["Número", "Grupo", "Status", "Data Criação"].map(h => `"${h}"`).join(","));
    participants.forEach(p => {
      sections.push([
        p.participantNumber,
        p.group === "intervention" ? "Intervenção" : "Controle",
        p.active ? "Ativo" : "Inativo",
        new Date(p.createdAt).toLocaleDateString("pt-BR"),
      ].map(c => `"${c}"`).join(","));
    });
    sections.push("");

    if (responses && responses.length > 0) {
      sections.push("=== RESPOSTAS DIÁRIAS ===");
      sections.push(["ID Participante", "Número", "Grupo", "Dia", "Bem-Estar ANTES", "Bem-Estar DEPOIS", "Pausa (min)", "Atividade", "Data"].map(h => `"${h}"`).join(","));
      responses.forEach(r => {
        const participant = participants.find(p => p.id === r.participantId);
        sections.push([
          r.participantId,
          participant?.participantNumber || "N/A",
          participant?.group === "intervention" ? "Intervenção" : "Controle",
          r.dayNumber,
          r.wellbeingBefore,
          r.wellbeingAfter || "N/A",
          r.pauseDuration ? Math.floor(r.pauseDuration / 60) : "N/A",
          r.currentActivity || "",
          new Date(r.responseDate).toLocaleString("pt-BR"),
        ].map(c => `"${c}"`).join(","));
      });
      sections.push("");
    }

    if (audioProgress && audioProgress.length > 0) {
      sections.push("=== PROGRESSO DE ÁUDIOS ===");
      sections.push(["ID Participante", "Número", "Áudio", "Dia", "% Escutado", "Completado", "Data"].map(h => `"${h}"`).join(","));
      audioProgress.forEach(a => {
        const participant = participants.find(p => p.id === a.participantId);
        sections.push([
          a.participantId,
          participant?.participantNumber || "N/A",
          a.audioNumber,
          a.dayNumber,
          a.percentageListened,
          a.completed ? "Sim" : "Não",
          new Date(a.accessDate).toLocaleString("pt-BR"),
        ].map(c => `"${c}"`).join(","));
      });
      sections.push("");
    }

    sections.push("=== ESTATÍSTICAS GERAIS ===");
    sections.push(`"Total de Participantes","${stats.totalParticipants}"`);
    sections.push(`"Grupo Intervenção","${stats.interventionCount}"`);
    sections.push(`"Grupo Controle","${stats.controlCount}"`);
    sections.push(`"Total de Respostas","${stats.totalResponses}"`);
    sections.push(`"Total de Registros de Áudio","${stats.totalAudioProgress}"`);
    sections.push(`"Data de Exportação","${new Date().toLocaleString("pt-BR")}"`);

    const content = sections.join("\n");
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_completo_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Relatório completo exportado com sucesso!");
  };

  // ─── SPSS export (calls backend endpoint) ─────────────────────────────────

  const downloadSpss = async (group?: "intervention" | "control") => {
    const url = group ? `/api/export/spss?group=${group}` : "/api/export/spss";
    const suffix = group === "intervention" ? "intervencao" : group === "control" ? "controle" : "completo";
    const response = await fetch(url, { method: "GET", credentials: "include" });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Erro desconhecido" }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `pesquisa_pausa_${suffix}_${new Date().toISOString().split("T")[0]}.sav`;
    link.click();
    URL.revokeObjectURL(objectUrl);
  };

  const handleExportSPSS = async () => {
    if (stats.totalResponses === 0) {
      toast.error("Não há dados para exportar em formato SPSS");
      return;
    }
    setSpssLoading(true);
    try {
      await downloadSpss();
      toast.success("Arquivo SPSS (.sav) exportado com sucesso!");
    } catch (error) {
      console.error("[SPSS Export]", error);
      toast.error(`Erro ao exportar SPSS: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSpssLoading(false);
    }
  };

  const handleExportSPSSByGroup = async (group: "intervention" | "control") => {
    const count = group === "intervention" ? stats.interventionCount : stats.controlCount;
    if (count === 0) {
      toast.error(`Não há participantes no grupo ${group === "intervention" ? "intervenção" : "controle"}`);
      return;
    }
    setSpssGroupLoading(group);
    try {
      await downloadSpss(group);
      const label = group === "intervention" ? "Intervenção" : "Controle";
      toast.success(`SPSS do grupo ${label} exportado com sucesso!`);
    } catch (error) {
      console.error("[SPSS Export by group]", error);
      toast.error(`Erro ao exportar SPSS: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSpssGroupLoading(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Relatórios e Exportação</h1>
          <p className="text-muted-foreground mt-1">
            Exporte dados da pesquisa com um clique
          </p>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalParticipants}</p>
                  <p className="text-xs text-muted-foreground">Participantes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalResponses}</p>
                  <p className="text-xs text-muted-foreground">Respostas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Headphones className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalAudioProgress}</p>
                  <p className="text-xs text-muted-foreground">Registros Áudio</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{stats.interventionCount}</Badge>
                  <span className="text-xs">Intervenção</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{stats.controlCount}</Badge>
                  <span className="text-xs">Controle</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── SPSS Export (destaque) ── */}
        <Card className="border-2 border-violet-400 bg-violet-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-violet-700" />
              <CardTitle className="text-violet-900">Exportar para SPSS (.sav)</CardTitle>
            </div>
            <CardDescription className="text-violet-700">
              Formato nativo do IBM SPSS Statistics — ideal para análise estatística direta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-violet-800">
              <div className="space-y-1">
                <p className="font-medium">O arquivo inclui:</p>
                <p>✓ Identificação e grupo de cada participante</p>
                <p>✓ Respostas diárias de bem-estar (antes e depois)</p>
                <p>✓ Duração da pausa e atividade registrada</p>
                <p>✓ Progresso de escuta dos áudios (grupo intervenção)</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium">Recursos SPSS incluídos:</p>
                <p>✓ <strong>Value labels</strong> nas variáveis categóricas</p>
                <p>✓ <strong>Variable labels</strong> descritivos em português</p>
                <p>✓ Formatos de impressão adequados (F1.0, F5.1, etc.)</p>
                <p>✓ Compatível com SPSS Statistics e PSPP (gratuito)</p>
              </div>
            </div>
            <Button
              onClick={handleExportSPSS}
              disabled={spssLoading || stats.totalResponses === 0}
              className="w-full bg-violet-700 hover:bg-violet-800 text-white"
              size="lg"
            >
              {spssLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Gerando arquivo SPSS…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar SPSS (.sav) — {stats.totalResponses} respostas
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ── SPSS por Grupo ── */}
        <Card className="border-2 border-violet-300 bg-violet-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-violet-700" />
              <CardTitle className="text-violet-900">Exportar SPSS por Grupo</CardTitle>
            </div>
            <CardDescription className="text-violet-700">
              Arquivos .sav separados para análise comparativa direta no SPSS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Intervenção */}
              <div className="rounded-lg border border-violet-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-violet-900">Grupo Intervenção</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.interventionCount} participantes
                    </p>
                  </div>
                  <Badge variant="secondary">{stats.interventionCount}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Inclui colunas de áudio (número, % escutado, completado)
                </p>
                <Button
                  onClick={() => handleExportSPSSByGroup("intervention")}
                  disabled={spssGroupLoading !== null || stats.interventionCount === 0}
                  className="w-full bg-violet-700 hover:bg-violet-800 text-white"
                >
                  {spssGroupLoading === "intervention" ? (
                    <><span className="animate-spin mr-2">⏳</span>Gerando…</>
                  ) : (
                    <><Download className="h-4 w-4 mr-2" />SPSS — Intervenção (.sav)</>
                  )}
                </Button>
              </div>

              {/* Controle */}
              <div className="rounded-lg border border-violet-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-violet-900">Grupo Controle</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.controlCount} participantes
                    </p>
                  </div>
                  <Badge variant="outline">{stats.controlCount}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Inclui colunas de pausa (duração, atividade registrada)
                </p>
                <Button
                  onClick={() => handleExportSPSSByGroup("control")}
                  disabled={spssGroupLoading !== null || stats.controlCount === 0}
                  variant="outline"
                  className="w-full border-violet-400 text-violet-800 hover:bg-violet-100"
                >
                  {spssGroupLoading === "control" ? (
                    <><span className="animate-spin mr-2">⏳</span>Gerando…</>
                  ) : (
                    <><Download className="h-4 w-4 mr-2" />SPSS — Controle (.sav)</>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exportação Rápida - Cards CSV */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Exportação Completa */}
          <Card className="border-2 border-primary">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <CardTitle>Relatório Completo (CSV)</CardTitle>
              </div>
              <CardDescription>
                Todos os dados em um único arquivo CSV
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>✓ Participantes ({stats.totalParticipants})</p>
                <p>✓ Respostas diárias ({stats.totalResponses})</p>
                <p>✓ Progresso de áudios ({stats.totalAudioProgress})</p>
                <p>✓ Estatísticas gerais</p>
              </div>
              <Button
                onClick={handleExportComplete}
                className="w-full"
                size="lg"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Tudo (CSV)
              </Button>
            </CardContent>
          </Card>

          {/* Respostas Diárias */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                <CardTitle>Respostas Diárias (CSV)</CardTitle>
              </div>
              <CardDescription>
                Bem-estar e atividades dos participantes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <p>{stats.totalResponses} respostas registradas</p>
              </div>
              <Button
                onClick={handleExportResponses}
                variant="outline"
                className="w-full"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Respostas (CSV)
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Exportação por Grupo */}
        <Card>
          <CardHeader>
            <CardTitle>Exportar por Grupo (CSV)</CardTitle>
            <CardDescription>
              Dados separados por grupo de intervenção e controle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Grupo Intervenção</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.interventionCount} participantes
                    </p>
                  </div>
                  <Badge variant="secondary">{stats.interventionCount}</Badge>
                </div>
                <Button
                  onClick={() => handleExportByGroup("intervention")}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Intervenção
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Grupo Controle</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.controlCount} participantes
                    </p>
                  </div>
                  <Badge variant="outline">{stats.controlCount}</Badge>
                </div>
                <Button
                  onClick={() => handleExportByGroup("control")}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Controle
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progresso de Áudios */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-purple-600" />
              <CardTitle>Progresso de Áudios (CSV)</CardTitle>
            </div>
            <CardDescription>
              Tracking detalhado de escuta dos áudios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              <p>{stats.totalAudioProgress} registros de progresso</p>
              <p className="text-xs mt-1">Inclui: % escutado, completado, última posição, data/hora</p>
            </div>
            <Button
              onClick={handleExportAudioProgress}
              variant="outline"
              className="w-full"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar Progresso de Áudios (CSV)
            </Button>
          </CardContent>
        </Card>

        {/* Informações sobre os arquivos */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Sobre os Formatos de Exportação</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 space-y-2">
            <p><strong>SPSS (.sav):</strong> Formato binário nativo do IBM SPSS Statistics. Inclui value labels e variable labels — abre diretamente no SPSS ou no PSPP (gratuito). Recomendado para análise estatística.</p>
            <p><strong>CSV:</strong> Texto simples compatível com Excel, R, Python e qualquer software de planilha. Codificação UTF-8 com BOM para preservar acentos.</p>
            <p><strong>Nome dos arquivos:</strong> Inclui tipo de dados e data de exportação para rastreabilidade.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
