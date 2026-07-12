import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  Database,
  Users,
  MessageSquare,
  Headphones,
  Download,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type SortField =
  | "participantNumber"
  | "group"
  | "dayNumber"
  | "wellbeingBefore"
  | "wellbeingAfter"
  | "pauseDuration"
  | "responseDate";

type SortDir = "asc" | "desc";

type AudioSortField =
  | "participantNumber"
  | "audioNumber"
  | "dayNumber"
  | "percentageListened"
  | "completed"
  | "accessDate";

const wellbeingLabel = (v: number | null | undefined) => {
  if (v == null) return "—";
  const labels: Record<number, string> = {
    1: "1 – Muito mal",
    2: "2 – Mal",
    3: "3 – Regular",
    4: "4 – Bem",
    5: "5 – Muito bem",
  };
  return labels[v] ?? String(v);
};

function SortIcon({
  field,
  current,
  dir,
}: {
  field: string;
  current: string;
  dir: SortDir;
}) {
  if (field !== current)
    return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40 inline" />;
  return dir === "asc" ? (
    <ArrowUp className="h-3 w-3 ml-1 inline text-primary" />
  ) : (
    <ArrowDown className="h-3 w-3 ml-1 inline text-primary" />
  );
}

export default function AdminData() {
  const [activeTab, setActiveTab] = useState<"responses" | "audio">("responses");

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: responses, isLoading: loadingResponses } =
    trpc.responses.getAll.useQuery();
  const { data: audioProgress, isLoading: loadingAudio } =
    trpc.audioProgress.getAll.useQuery();
  const { data: participants } = trpc.participants.list.useQuery();

  // ── Responses filters & sort ───────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<"all" | "intervention" | "control">("all");
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("responseDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // ── Audio filters & sort ───────────────────────────────────────────────────
  const [audioSearch, setAudioSearch] = useState("");
  const [audioGroupFilter, setAudioGroupFilter] = useState<"all" | "intervention" | "control">("all");
  const [audioSortField, setAudioSortField] = useState<AudioSortField>("accessDate");
  const [audioSortDir, setAudioSortDir] = useState<SortDir>("desc");
  const [audioPage, setAudioPage] = useState(1);
  const [audioPageSize, setAudioPageSize] = useState(25);
  const [spssFilteredLoading, setSpssFilteredLoading] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const participantMap = useMemo(
    () => new Map((participants ?? []).map((p) => [p.id, p])),
    [participants]
  );

  const getP = (id: number) => participantMap.get(id);

  // ── Unique days for filter dropdown ───────────────────────────────────────
  const uniqueDays = useMemo(() => {
    const days = new Set((responses ?? []).map((r) => r.dayNumber));
    return Array.from(days).sort((a, b) => a - b);
  }, [responses]);

  // ── Filtered + sorted responses ───────────────────────────────────────────
  const filteredResponses = useMemo(() => {
    let rows = responses ?? [];

    // Group filter
    if (groupFilter !== "all") {
      rows = rows.filter((r) => getP(r.participantId)?.group === groupFilter);
    }

    // Day filter
    if (dayFilter !== "all") {
      const day = parseInt(dayFilter);
      rows = rows.filter((r) => r.dayNumber === day);
    }

    // Search by participant number
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) =>
        (getP(r.participantId)?.participantNumber ?? "")
          .toLowerCase()
          .includes(q)
      );
    }

    // Sort
    rows = [...rows].sort((a, b) => {
      let av: string | number | Date = 0;
      let bv: string | number | Date = 0;
      switch (sortField) {
        case "participantNumber":
          av = getP(a.participantId)?.participantNumber ?? "";
          bv = getP(b.participantId)?.participantNumber ?? "";
          break;
        case "group":
          av = getP(a.participantId)?.group ?? "";
          bv = getP(b.participantId)?.group ?? "";
          break;
        case "dayNumber":
          av = a.dayNumber;
          bv = b.dayNumber;
          break;
        case "wellbeingBefore":
          av = a.wellbeingBefore ?? 0;
          bv = b.wellbeingBefore ?? 0;
          break;
        case "wellbeingAfter":
          av = a.wellbeingAfter ?? 0;
          bv = b.wellbeingAfter ?? 0;
          break;
        case "pauseDuration":
          av = a.pauseDuration ?? 0;
          bv = b.pauseDuration ?? 0;
          break;
        case "responseDate":
          av = new Date(a.responseDate);
          bv = new Date(b.responseDate);
          break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }, [responses, groupFilter, dayFilter, search, sortField, sortDir, participantMap]);

  const totalPages = Math.max(1, Math.ceil(filteredResponses.length / pageSize));
  const pagedResponses = filteredResponses.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  // ── Filtered + sorted audio ───────────────────────────────────────────────
  const filteredAudio = useMemo(() => {
    let rows = audioProgress ?? [];

    if (audioGroupFilter !== "all") {
      rows = rows.filter(
        (a) => getP(a.participantId)?.group === audioGroupFilter
      );
    }

    if (audioSearch.trim()) {
      const q = audioSearch.trim().toLowerCase();
      rows = rows.filter((a) =>
        (getP(a.participantId)?.participantNumber ?? "")
          .toLowerCase()
          .includes(q)
      );
    }

    rows = [...rows].sort((a, b) => {
      let av: string | number | Date = 0;
      let bv: string | number | Date = 0;
      switch (audioSortField) {
        case "participantNumber":
          av = getP(a.participantId)?.participantNumber ?? "";
          bv = getP(b.participantId)?.participantNumber ?? "";
          break;
        case "audioNumber":
          av = a.audioNumber;
          bv = b.audioNumber;
          break;
        case "dayNumber":
          av = a.dayNumber;
          bv = b.dayNumber;
          break;
        case "percentageListened":
          av = a.percentageListened;
          bv = b.percentageListened;
          break;
        case "completed":
          av = a.completed ? 1 : 0;
          bv = b.completed ? 1 : 0;
          break;
        case "accessDate":
          av = new Date(a.accessDate);
          bv = new Date(b.accessDate);
          break;
      }
      if (av < bv) return audioSortDir === "asc" ? -1 : 1;
      if (av > bv) return audioSortDir === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }, [audioProgress, audioGroupFilter, audioSearch, audioSortField, audioSortDir, participantMap]);

  const audioTotalPages = Math.max(
    1,
    Math.ceil(filteredAudio.length / audioPageSize)
  );
  const pagedAudio = filteredAudio.slice(
    (audioPage - 1) * audioPageSize,
    audioPage * audioPageSize
  );

  const toggleAudioSort = (field: AudioSortField) => {
    if (audioSortField === field) {
      setAudioSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setAudioSortField(field);
      setAudioSortDir("asc");
    }
    setAudioPage(1);
  };

  // ── Filtered SPSS export ─────────────────────────────────────────────────
  const handleExportSPSSFiltered = async () => {
    if (filteredResponses.length === 0) {
      toast.error("Nenhum registro visível para exportar");
      return;
    }
    setSpssFilteredLoading(true);
    try {
      const ids = filteredResponses.map((r) => r.id);
      const parts: string[] = [];
      if (groupFilter !== "all") parts.push(groupFilter === "intervention" ? "Intervenção" : "Controle");
      if (dayFilter !== "all") parts.push(`Dia ${dayFilter}`);
      if (search.trim()) parts.push(`Participante: ${search.trim()}`);
      const label = parts.length > 0
        ? `Pesquisa PAUSA - ${parts.join(" | ")} (${ids.length} registros)`
        : `Pesquisa PAUSA - Todos os registros (${ids.length})`;

      const resp = await fetch("/api/export/spss-filtered", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseIds: ids, label }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const suffix = parts.length > 0
        ? parts.join("_").replace(/[^a-z0-9]/gi, "_").toLowerCase()
        : "filtrado";
      link.download = `pesquisa_pausa_${suffix}_${new Date().toISOString().split("T")[0]}.sav`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`SPSS exportado: ${ids.length} registros filtrados!`);
    } catch (error) {
      console.error("[SPSS Filtered]", error);
      toast.error(`Erro ao exportar SPSS: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSpssFilteredLoading(false);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    totalParticipants: participants?.length ?? 0,
    interventionCount:
      participants?.filter((p) => p.group === "intervention").length ?? 0,
    controlCount:
      participants?.filter((p) => p.group === "control").length ?? 0,
    totalResponses: responses?.length ?? 0,
    totalAudio: audioProgress?.length ?? 0,
  };

  // ── Pagination helper ─────────────────────────────────────────────────────
  function Pagination({
    current,
    total,
    onPage,
    size,
    onSize,
    totalRows,
    filteredRows,
  }: {
    current: number;
    total: number;
    onPage: (p: number) => void;
    size: number;
    onSize: (s: number) => void;
    totalRows: number;
    filteredRows: number;
  }) {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Linhas por página:</span>
          <Select
            value={String(size)}
            onValueChange={(v) => {
              onSize(parseInt(v));
              onPage(1);
            }}
          >
            <SelectTrigger className="h-7 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs">
            {filteredRows < totalRows
              ? `${filteredRows} de ${totalRows} registros`
              : `${totalRows} registros`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={current === 1}
            onClick={() => onPage(1)}
          >
            <ChevronsLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={current === 1}
            onClick={() => onPage(current - 1)}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="px-2 text-xs">
            Página {current} de {total}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={current === total}
            onClick={() => onPage(current + 1)}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={current === total}
            onClick={() => onPage(total)}
          >
            <ChevronsRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Dados Coletados</h1>
          <p className="text-muted-foreground mt-1">
            Visualize, filtre e ordene todos os dados antes de exportar
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500 shrink-0" />
                <div>
                  <p className="text-xl font-bold leading-none">{stats.totalParticipants}</p>
                  <p className="text-xs text-muted-foreground mt-1">Participantes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                <div>
                  <p className="text-xl font-bold leading-none">{stats.interventionCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">Intervenção</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gray-400 shrink-0" />
                <div>
                  <p className="text-xl font-bold leading-none">{stats.controlCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">Controle</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-500 shrink-0" />
                <div>
                  <p className="text-xl font-bold leading-none">{stats.totalResponses}</p>
                  <p className="text-xs text-muted-foreground mt-1">Respostas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Headphones className="h-4 w-4 text-purple-500 shrink-0" />
                <div>
                  <p className="text-xl font-bold leading-none">{stats.totalAudio}</p>
                  <p className="text-xs text-muted-foreground mt-1">Reg. Áudio</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          <button
            onClick={() => setActiveTab("responses")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "responses"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Respostas Diárias
            <Badge variant="secondary" className="ml-1 text-xs">
              {stats.totalResponses}
            </Badge>
          </button>
          <button
            onClick={() => setActiveTab("audio")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "audio"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Headphones className="h-4 w-4" />
            Progresso de Áudios
            <Badge variant="secondary" className="ml-1 text-xs">
              {stats.totalAudio}
            </Badge>
          </button>
        </div>

        {/* ── RESPOSTAS DIÁRIAS ── */}
        {activeTab === "responses" && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>Respostas Diárias</CardTitle>
                  <CardDescription>
                    Bem-estar e atividades de todos os participantes
                  </CardDescription>
                </div>
                <Button
                  onClick={handleExportSPSSFiltered}
                  disabled={spssFilteredLoading || filteredResponses.length === 0}
                  className="bg-violet-700 hover:bg-violet-800 text-white shrink-0"
                  size="sm"
                >
                  {spssFilteredLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando…</>
                  ) : (
                    <><Download className="h-4 w-4 mr-2" />Exportar SPSS ({filteredResponses.length})</>
                  )}
                </Button>
              </div>

              {/* Filters row */}
              <div className="flex flex-wrap gap-2 pt-2">
                <div className="relative flex-1 min-w-[160px] max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar participante…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="pl-8 h-8 text-sm"
                  />
                </div>

                <Select
                  value={groupFilter}
                  onValueChange={(v) => {
                    setGroupFilter(v as typeof groupFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-36 text-sm">
                    <SelectValue placeholder="Grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os grupos</SelectItem>
                    <SelectItem value="intervention">Intervenção</SelectItem>
                    <SelectItem value="control">Controle</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={dayFilter}
                  onValueChange={(v) => {
                    setDayFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-28 text-sm">
                    <SelectValue placeholder="Dia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os dias</SelectItem>
                    {uniqueDays.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        Dia {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(search || groupFilter !== "all" || dayFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => {
                      setSearch("");
                      setGroupFilter("all");
                      setDayFilter("all");
                      setPage(1);
                    }}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {loadingResponses ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredResponses.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhuma resposta encontrada</p>
                  <p className="text-sm mt-1">Tente ajustar os filtros acima</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          {(
                            [
                              { field: "participantNumber", label: "Participante" },
                              { field: "group", label: "Grupo" },
                              { field: "dayNumber", label: "Dia" },
                              { field: "wellbeingBefore", label: "Bem-Estar Antes" },
                              { field: "wellbeingAfter", label: "Bem-Estar Depois" },
                              { field: "pauseDuration", label: "Pausa (min)" },
                            ] as { field: SortField; label: string }[]
                          ).map(({ field, label }) => (
                            <th
                              key={field}
                              className="px-3 py-2.5 text-left font-medium text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                              onClick={() => toggleSort(field)}
                            >
                              {label}
                              <SortIcon
                                field={field}
                                current={sortField}
                                dir={sortDir}
                              />
                            </th>
                          ))}
                          <th className="px-3 py-2.5 text-left font-medium text-xs text-muted-foreground whitespace-nowrap">
                            Atividade
                          </th>
                          <th
                            className="px-3 py-2.5 text-left font-medium text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                            onClick={() => toggleSort("responseDate")}
                          >
                            Data/Hora
                            <SortIcon
                              field="responseDate"
                              current={sortField}
                              dir={sortDir}
                            />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedResponses.map((r, idx) => {
                          const p = getP(r.participantId);
                          const isIntervention = p?.group === "intervention";
                          return (
                            <tr
                              key={r.id ?? idx}
                              className="border-t hover:bg-muted/30 transition-colors"
                            >
                              <td className="px-3 py-2.5 font-mono text-xs font-medium">
                                {p?.participantNumber ?? `#${r.participantId}`}
                              </td>
                              <td className="px-3 py-2.5">
                                <Badge
                                  variant={isIntervention ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {isIntervention ? "Intervenção" : "Controle"}
                                </Badge>
                              </td>
                              <td className="px-3 py-2.5 text-center font-medium">
                                {r.dayNumber}
                              </td>
                              <td className="px-3 py-2.5">
                                <span
                                  className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold text-white ${
                                    (r.wellbeingBefore ?? 0) >= 4
                                      ? "bg-green-500"
                                      : (r.wellbeingBefore ?? 0) === 3
                                      ? "bg-yellow-500"
                                      : "bg-red-400"
                                  }`}
                                >
                                  {r.wellbeingBefore ?? "—"}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                {r.wellbeingAfter != null ? (
                                  <span
                                    className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold text-white ${
                                      r.wellbeingAfter >= 4
                                        ? "bg-green-500"
                                        : r.wellbeingAfter === 3
                                        ? "bg-yellow-500"
                                        : "bg-red-400"
                                    }`}
                                  >
                                    {r.wellbeingAfter}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {r.pauseDuration != null
                                  ? `${Math.floor(r.pauseDuration / 60)} min`
                                  : <span className="text-muted-foreground text-xs">—</span>}
                              </td>
                              <td className="px-3 py-2.5 max-w-[180px]">
                                <span
                                  className="block truncate text-xs text-muted-foreground"
                                  title={r.currentActivity ?? ""}
                                >
                                  {r.currentActivity || "—"}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(r.responseDate).toLocaleDateString("pt-BR")}{" "}
                                {new Date(r.responseDate).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <Pagination
                    current={page}
                    total={totalPages}
                    onPage={setPage}
                    size={pageSize}
                    onSize={setPageSize}
                    totalRows={responses?.length ?? 0}
                    filteredRows={filteredResponses.length}
                  />
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── PROGRESSO DE ÁUDIOS ── */}
        {activeTab === "audio" && (
          <Card>
            <CardHeader className="pb-3">
              <div>
                <CardTitle>Progresso de Áudios</CardTitle>
                <CardDescription>
                  Registro de escuta dos áudios do grupo intervenção
                </CardDescription>
              </div>

              {/* Filters row */}
              <div className="flex flex-wrap gap-2 pt-2">
                <div className="relative flex-1 min-w-[160px] max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar participante…"
                    value={audioSearch}
                    onChange={(e) => {
                      setAudioSearch(e.target.value);
                      setAudioPage(1);
                    }}
                    className="pl-8 h-8 text-sm"
                  />
                </div>

                <Select
                  value={audioGroupFilter}
                  onValueChange={(v) => {
                    setAudioGroupFilter(v as typeof audioGroupFilter);
                    setAudioPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-36 text-sm">
                    <SelectValue placeholder="Grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os grupos</SelectItem>
                    <SelectItem value="intervention">Intervenção</SelectItem>
                    <SelectItem value="control">Controle</SelectItem>
                  </SelectContent>
                </Select>

                {(audioSearch || audioGroupFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => {
                      setAudioSearch("");
                      setAudioGroupFilter("all");
                      setAudioPage(1);
                    }}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {loadingAudio ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAudio.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Headphones className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum registro de áudio encontrado</p>
                  <p className="text-sm mt-1">Tente ajustar os filtros acima</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          {(
                            [
                              { field: "participantNumber", label: "Participante" },
                              { field: "audioNumber", label: "Áudio" },
                              { field: "dayNumber", label: "Dia" },
                              { field: "percentageListened", label: "% Escutado" },
                              { field: "completed", label: "Completado" },
                              { field: "accessDate", label: "Data/Hora" },
                            ] as { field: AudioSortField; label: string }[]
                          ).map(({ field, label }) => (
                            <th
                              key={field}
                              className="px-3 py-2.5 text-left font-medium text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                              onClick={() => toggleAudioSort(field)}
                            >
                              {label}
                              <SortIcon
                                field={field}
                                current={audioSortField}
                                dir={audioSortDir}
                              />
                            </th>
                          ))}
                          <th className="px-3 py-2.5 text-left font-medium text-xs text-muted-foreground whitespace-nowrap">
                            Última Pos. (s)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedAudio.map((a, idx) => {
                          const p = getP(a.participantId);
                          const pct = a.percentageListened;
                          return (
                            <tr
                              key={a.id ?? idx}
                              className="border-t hover:bg-muted/30 transition-colors"
                            >
                              <td className="px-3 py-2.5 font-mono text-xs font-medium">
                                {p?.participantNumber ?? `#${a.participantId}`}
                              </td>
                              <td className="px-3 py-2.5 text-center font-medium">
                                {a.audioNumber}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {a.dayNumber}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-muted rounded-full h-1.5 min-w-[60px]">
                                    <div
                                      className={`h-1.5 rounded-full transition-all ${
                                        pct >= 80
                                          ? "bg-green-500"
                                          : pct >= 40
                                          ? "bg-yellow-500"
                                          : "bg-red-400"
                                      }`}
                                      style={{ width: `${Math.min(100, pct)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium w-10 text-right">
                                    {pct.toFixed(0)}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {a.completed ? (
                                  <Badge className="bg-green-100 text-green-800 text-xs border-0">
                                    Sim
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-muted-foreground">
                                    Não
                                  </Badge>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(a.accessDate).toLocaleDateString("pt-BR")}{" "}
                                {new Date(a.accessDate).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-center text-muted-foreground">
                                {a.lastPosition}s
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <Pagination
                    current={audioPage}
                    total={audioTotalPages}
                    onPage={setAudioPage}
                    size={audioPageSize}
                    onSize={setAudioPageSize}
                    totalRows={audioProgress?.length ?? 0}
                    filteredRows={filteredAudio.length}
                  />
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
