import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { downloadCsv } from "@/lib/csv";
import { Download, FileSpreadsheet, Users, Activity, Headphones, Package, BarChart2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function AdminReports() {
  const { data: participants } = trpc.participants.list.useQuery();
  const { data: responses } = trpc.responses.getAll.useQuery();
  const { data: audioProgress } = trpc.audioProgress.getAll.useQuery();
  const { data: progressOverview } = trpc.participants.progressOverview.useQuery();
  const [spssLoading, setSpssLoading] = useState(false);
  const [spssGroupLoading, setSpssGroupLoading] = useState<"intervention" | "control" | null>(null);
  const [spssGeneralLoading, setSpssGeneralLoading] = useState<"all" | "intervention" | "control" | null>(null);

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
    if (!participants || participants.length === 0) {
      toast.error("Não há participantes cadastrados");
      return;
    }

    // Participantes sem nenhuma resposta também entram (linha com "-") —
    // o export não pode ser bloqueado nem ocultar participantes por falta de respostas
    const respondedIds = new Set((responses ?? []).map(r => r.participantId));

    const csv = [
      ["ID Participante", "Número Participante", "Grupo", "Dia", "Bem-Estar ANTES (1-5)", "Bem-Estar DEPOIS (1-5)", "Duração Pausa (min)", "Atividade Atual", "Data/Hora"],
      ...(responses ?? []).map((r) => {
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
        ] as (string | number)[];
      }),
      ...participants
        .filter(p => !respondedIds.has(p.id))
        .map(p => [
          p.id,
          p.participantNumber,
          p.group === "intervention" ? "Intervenção" : "Controle",
          "-", "-", "-", "-", "Sem respostas registradas", "-",
        ] as (string | number)[]),
    ];

    downloadCsv(`respostas_diarias_${new Date().toLocaleDateString("en-CA")}.csv`, csv);
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
    ];

    downloadCsv(`progresso_audios_${new Date().toLocaleDateString("en-CA")}.csv`, csv);
    toast.success("Progresso de áudios exportado com sucesso!");
  };

  const handleExportByGroup = (group: "intervention" | "control") => {
    const groupParticipants = participants?.filter(p => p.group === group) || [];
    const groupResponses = responses?.filter(r =>
      groupParticipants.some(p => p.id === r.participantId)
    ) || [];

    if (groupParticipants.length === 0) {
      toast.error(`Não há participantes no grupo ${group === "intervention" ? "intervenção" : "controle"}`);
      return;
    }

    // Participantes do grupo sem resposta também entram — export nunca bloqueia
    const respondedIds = new Set(groupResponses.map(r => r.participantId));

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
        ] as (string | number)[];
      }),
      ...groupParticipants
        .filter(p => !respondedIds.has(p.id))
        .map(p => [
          p.id,
          p.participantNumber,
          "-", "-", "-", "-", "Sem respostas registradas", "-",
        ] as (string | number)[]),
    ];

    const groupName = group === "intervention" ? "intervencao" : "controle";
    downloadCsv(`respostas_${groupName}_${new Date().toLocaleDateString("en-CA")}.csv`, csv);
    toast.success(`Respostas do grupo ${group === "intervention" ? "intervenção" : "controle"} exportadas!`);
  };

  const handleExportComplete = () => {
    if (!participants || participants.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const rows: (string | number)[][] = [];

    rows.push(["=== PARTICIPANTES ==="]);
    rows.push(["Número", "Grupo", "Status", "Data Criação"]);
    participants.forEach(p => {
      rows.push([
        p.participantNumber,
        p.group === "intervention" ? "Intervenção" : "Controle",
        p.active ? "Ativo" : "Inativo",
        new Date(p.createdAt).toLocaleDateString("pt-BR"),
      ]);
    });
    rows.push([]);

    if (responses && responses.length > 0) {
      rows.push(["=== RESPOSTAS DIÁRIAS ==="]);
      rows.push(["ID Participante", "Número", "Grupo", "Dia", "Bem-Estar ANTES", "Bem-Estar DEPOIS", "Pausa (min)", "Atividade", "Data"]);
      responses.forEach(r => {
        const participant = participants.find(p => p.id === r.participantId);
        rows.push([
          r.participantId,
          participant?.participantNumber || "N/A",
          participant?.group === "intervention" ? "Intervenção" : "Controle",
          r.dayNumber,
          r.wellbeingBefore,
          r.wellbeingAfter || "N/A",
          r.pauseDuration ? Math.floor(r.pauseDuration / 60) : "N/A",
          r.currentActivity || "",
          new Date(r.responseDate).toLocaleString("pt-BR"),
        ]);
      });
      rows.push([]);
    }

    if (audioProgress && audioProgress.length > 0) {
      rows.push(["=== PROGRESSO DE ÁUDIOS ==="]);
      rows.push(["ID Participante", "Número", "Áudio", "Dia", "% Escutado", "Completado", "Data"]);
      audioProgress.forEach(a => {
        const participant = participants.find(p => p.id === a.participantId);
        rows.push([
          a.participantId,
          participant?.participantNumber || "N/A",
          a.audioNumber,
          a.dayNumber,
          a.percentageListened,
          a.completed ? "Sim" : "Não",
          new Date(a.accessDate).toLocaleString("pt-BR"),
        ]);
      });
      rows.push([]);
    }

    rows.push(["=== ESTATÍSTICAS GERAIS ==="]);
    rows.push(["Total de Participantes", stats.totalParticipants]);
    rows.push(["Grupo Intervenção", stats.interventionCount]);
    rows.push(["Grupo Controle", stats.controlCount]);
    rows.push(["Total de Respostas", stats.totalResponses]);
    rows.push(["Total de Registros de Áudio", stats.totalAudioProgress]);
    rows.push(["Data de Exportação", new Date().toLocaleString("pt-BR")]);

    downloadCsv(`relatorio_completo_${new Date().toLocaleDateString("en-CA")}.csv`, rows);
    toast.success("Relatório completo exportado com sucesso!");
  };

  // ─── Export Geral por Dia (formato longo: 1 linha por participante × dia) ──

  const handleExportGeneral = (group?: "intervention" | "control") => {
    const scope = group
      ? (participants ?? []).filter(p => p.group === group)
      : (participants ?? []);

    if (scope.length === 0) {
      toast.error("Não há participantes para exportar");
      return;
    }

    const progressById = new Map((progressOverview ?? []).map(p => [p.participantId, p]));

    // Respostas indexadas por participante e dia
    const responsesByParticipant = new Map<number, Map<number, NonNullable<typeof responses>[0]>>();
    for (const r of responses ?? []) {
      let byDay = responsesByParticipant.get(r.participantId);
      if (!byDay) {
        byDay = new Map();
        responsesByParticipant.set(r.participantId, byDay);
      }
      byDay.set(r.dayNumber, r);
    }

    // Maior percentual de áudio por participante+dia
    const audioPctByDay = new Map<string, number>();
    for (const a of audioProgress ?? []) {
      const key = `${a.participantId}_${a.dayNumber}`;
      const current = audioPctByDay.get(key);
      if (current === undefined || a.percentageListened > current) {
        audioPctByDay.set(key, a.percentageListened);
      }
    }

    const rows: (string | number)[][] = [
      ["Número Participante", "Grupo", "Dia", "Respondeu", "Número do Áudio", "% Áudio Escutado", "Sentimento ANTES (1-5)", "Sentimento DEPOIS (1-5)", "Resposta do Dia (Atividade)", "Data da Resposta", "Dias Respondidos", "Quais Dias Respondidos"],
    ];

    for (const p of scope) {
      const groupLabel = p.group === "intervention" ? "Intervenção" : "Controle";
      const progress = progressById.get(p.id);
      const byDay = responsesByParticipant.get(p.id);
      const respondedDays = byDay ? Array.from(byDay.keys()).sort((a, b) => a - b) : [];

      if (!progress || progress.currentDay == null) {
        // Nunca acessou o app: uma linha única
        rows.push([p.participantNumber, groupLabel, "-", "Não iniciou", "-", "-", "-", "-", "-", "-", 0, "-"]);
        continue;
      }

      const lastDay = Math.min(progress.currentDay, 28);
      const isIntervention = p.group === "intervention";

      for (let day = 1; day <= lastDay; day++) {
        const response = byDay?.get(day);
        rows.push([
          p.participantNumber,
          groupLabel,
          day,
          response ? "Sim" : "Não",
          isIntervention ? Math.ceil(day / 7) : "-",
          isIntervention ? (audioPctByDay.get(`${p.id}_${day}`) ?? "-") : "-",
          response?.wellbeingBefore ?? "-",
          response?.wellbeingAfter ?? "-",
          response?.currentActivity || "-",
          response ? new Date(response.responseDate).toLocaleDateString("pt-BR") : "-",
          respondedDays.length,
          respondedDays.join(", ") || "-",
        ]);
      }
    }

    const suffix = group === "intervention" ? "geral_intervencao" : group === "control" ? "geral_controle" : "geral";
    downloadCsv(`pesquisa_pausa_${suffix}_${new Date().toLocaleDateString("en-CA")}.csv`, rows);
    toast.success("Export geral (CSV) gerado com sucesso!");
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
    link.download = `pesquisa_pausa_${suffix}_${new Date().toLocaleDateString("en-CA")}.sav`;
    link.click();
    URL.revokeObjectURL(objectUrl);
  };

  // Export Geral por Dia em SPSS (endpoint dedicado no backend)
  const handleExportSpssGeneral = async (group?: "intervention" | "control") => {
    setSpssGeneralLoading(group ?? "all");
    try {
      const url = group ? `/api/export/spss-general?group=${group}` : "/api/export/spss-general";
      const response = await fetch(url, { method: "GET", credentials: "include" });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const suffix = group === "intervention" ? "geral_intervencao" : group === "control" ? "geral_controle" : "geral";
      link.href = objectUrl;
      link.download = `pesquisa_pausa_${suffix}_${new Date().toLocaleDateString("en-CA")}.sav`;
      link.click();
      URL.revokeObjectURL(objectUrl);
      toast.success("Export geral (SPSS) gerado com sucesso!");
    } catch (error) {
      console.error("[SPSS General Export]", error);
      toast.error(`Erro ao exportar SPSS: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSpssGeneralLoading(null);
    }
  };

  const handleExportSPSS = async () => {
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

        {/* ── Export Geral por Dia ── */}
        <Card className="border-2 border-emerald-400 bg-emerald-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-700" />
              <CardTitle className="text-emerald-900">Export Geral por Dia (CSV e SPSS)</CardTitle>
            </div>
            <CardDescription className="text-emerald-700">
              Uma linha por participante × dia decorrido: grupo, áudio do dia, % escutado,
              sentimentos antes/depois, resposta, dias respondidos e quais dias. Inclui dias
              sem resposta e participantes que nunca acessaram — nunca bloqueia por falta de dados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                onClick={() => handleExportGeneral()}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Geral (CSV)
              </Button>
              <Button
                onClick={() => handleExportGeneral("intervention")}
                variant="outline"
                className="w-full border-emerald-400 text-emerald-800 hover:bg-emerald-100"
              >
                <Download className="h-4 w-4 mr-2" />
                Intervenção (CSV)
              </Button>
              <Button
                onClick={() => handleExportGeneral("control")}
                variant="outline"
                className="w-full border-emerald-400 text-emerald-800 hover:bg-emerald-100"
              >
                <Download className="h-4 w-4 mr-2" />
                Controle (CSV)
              </Button>
              <Button
                onClick={() => handleExportSpssGeneral()}
                disabled={spssGeneralLoading !== null}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                {spssGeneralLoading === "all" ? (
                  <><span className="animate-spin mr-2">⏳</span>Gerando…</>
                ) : (
                  <><Download className="h-4 w-4 mr-2" />Geral (SPSS .sav)</>
                )}
              </Button>
              <Button
                onClick={() => handleExportSpssGeneral("intervention")}
                disabled={spssGeneralLoading !== null}
                variant="outline"
                className="w-full border-emerald-400 text-emerald-800 hover:bg-emerald-100"
              >
                {spssGeneralLoading === "intervention" ? (
                  <><span className="animate-spin mr-2">⏳</span>Gerando…</>
                ) : (
                  <><Download className="h-4 w-4 mr-2" />Intervenção (SPSS .sav)</>
                )}
              </Button>
              <Button
                onClick={() => handleExportSpssGeneral("control")}
                disabled={spssGeneralLoading !== null}
                variant="outline"
                className="w-full border-emerald-400 text-emerald-800 hover:bg-emerald-100"
              >
                {spssGeneralLoading === "control" ? (
                  <><span className="animate-spin mr-2">⏳</span>Gerando…</>
                ) : (
                  <><Download className="h-4 w-4 mr-2" />Controle (SPSS .sav)</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

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
              disabled={spssLoading}
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
