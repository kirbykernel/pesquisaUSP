import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { trpc } from "@/lib/trpc";
import { Plus, Download, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminParticipants() {
  const [count, setCount] = useState(1);
  const [group, setGroup] = useState<"intervention" | "control">("intervention");
  const { data: participants, isLoading, refetch } = trpc.participants.list.useQuery();
  const { data: progressOverview, refetch: refetchProgress } = trpc.participants.progressOverview.useQuery();

  // Mapa participantId -> adesão (dia atual, práticas, dias perdidos)
  const progressById = new Map(
    (progressOverview ?? []).map((p) => [p.participantId, p])
  );
  const createMutation = trpc.participants.create.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.participants.length} participante(s) criado(s) com sucesso!`);
      refetch();
      refetchProgress();
      setCount(1);
    },
    onError: (error) => {
      toast.error(`Erro ao criar participantes: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (count < 1 || count > 100) {
      toast.error("Quantidade deve ser entre 1 e 100");
      return;
    }
    createMutation.mutate({ count, group });
  };

  const handleExport = () => {
    if (!participants || participants.length === 0) {
      toast.error("Não há participantes para exportar");
      return;
    }

    const csv = [
      ["Número", "Grupo", "Status", "Data de Cadastro", "Dia Atual", "Práticas Completadas", "Dias Perdidos", "Quais Dias Perdidos"],
      ...participants.map((p) => {
        const progress = progressById.get(p.id);
        return [
          p.participantNumber,
          p.group === "intervention" ? "Intervenção" : "Controle",
          p.active ? "Ativo" : "Inativo",
          new Date(p.createdAt).toLocaleDateString("pt-BR"),
          progress?.currentDay == null
            ? "Não iniciou"
            : progress.currentDay > 28
              ? "Concluído"
              : String(progress.currentDay),
          String(progress?.completedCount ?? 0),
          String(progress?.missedDays.length ?? 0),
          (progress?.missedDays ?? []).join(" "),
        ];
      }),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `participantes_${new Date().toLocaleDateString("en-CA")}.csv`;
    link.click();
    toast.success("Lista exportada com sucesso!");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Participantes</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os participantes da pesquisa
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { refetch(); refetchProgress(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Criar Novos Participantes</CardTitle>
            <CardDescription>
              O sistema irá gerar números únicos para o grupo selecionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <Label className="mb-1 block">Grupo</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={group}
                  onValueChange={(value) => {
                    if (value) setGroup(value as "intervention" | "control");
                  }}
                >
                  <ToggleGroupItem value="intervention" className="px-4">
                    Intervenção
                  </ToggleGroupItem>
                  <ToggleGroupItem value="control" className="px-4">
                    Controle
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="flex-1 max-w-xs">
                <Label htmlFor="count">Quantidade</Label>
                <Input
                  id="count"
                  type="number"
                  min="1"
                  max="100"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                  placeholder="Ex: 10"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Máximo: 100 participantes por vez
                </p>
              </div>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                {createMutation.isPending ? "Criando..." : "Criar Participantes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Participantes</CardTitle>
            <CardDescription>
              {participants?.length || 0} participante(s) cadastrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
              </div>
            ) : !participants || participants.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Nenhum participante cadastrado ainda
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Grupo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data de Cadastro</TableHead>
                      <TableHead>Dia Atual</TableHead>
                      <TableHead>Práticas</TableHead>
                      <TableHead>Dias Perdidos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants.map((participant) => {
                      const progress = progressById.get(participant.id);
                      const missedCount = progress?.missedDays.length ?? 0;
                      return (
                      <TableRow key={participant.id}>
                        <TableCell className="font-mono font-medium">
                          {participant.participantNumber}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              participant.group === "intervention"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {participant.group === "intervention"
                              ? "Intervenção"
                              : "Controle"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={participant.active ? "default" : "outline"}
                          >
                            {participant.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(participant.createdAt).toLocaleDateString(
                            "pt-BR",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }
                          )}
                        </TableCell>
                        <TableCell>
                          {progress?.currentDay == null ? (
                            <span className="text-muted-foreground text-sm">Não iniciou</span>
                          ) : progress.currentDay > 28 ? (
                            <Badge variant="outline" className="border-green-500 text-green-700">
                              Concluído
                            </Badge>
                          ) : (
                            <span className="font-medium">{progress.currentDay} / 28</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {progress?.completedCount ?? 0}
                        </TableCell>
                        <TableCell>
                          {missedCount === 0 ? (
                            <span className="text-muted-foreground">0</span>
                          ) : (
                            <Badge
                              variant="destructive"
                              title={`Dias perdidos: ${progress!.missedDays.join(", ")}`}
                            >
                              {missedCount} {missedCount === 1 ? "dia" : "dias"}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
