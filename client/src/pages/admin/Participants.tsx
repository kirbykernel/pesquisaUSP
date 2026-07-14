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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { downloadCsv } from "@/lib/csv";
import { Plus, Download, RefreshCw, Trash2 } from "lucide-react";
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

  // Participante selecionado para exclusão (abre o dialog de confirmação)
  const [participantToDelete, setParticipantToDelete] = useState<{ id: number; participantNumber: string } | null>(null);

  const deleteMutation = trpc.participants.delete.useMutation({
    onSuccess: (data) => {
      toast.success(`Participante ${data.participantNumber} excluído com sucesso`);
      setParticipantToDelete(null);
      refetch();
      refetchProgress();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir participante: ${error.message}`);
      setParticipantToDelete(null);
    },
  });

  const handleExportGroup = (exportGroup: "intervention" | "control") => {
    const groupLabel = exportGroup === "intervention" ? "Intervenção" : "Controle";
    const filtered = (participants ?? []).filter((p) => p.group === exportGroup);

    if (filtered.length === 0) {
      toast.error(`Não há participantes do grupo ${groupLabel} para exportar`);
      return;
    }

    const suffix = exportGroup === "intervention" ? "intervencao" : "controle";
    downloadCsv(`participantes_${suffix}_${new Date().toLocaleDateString("en-CA")}.csv`, [
      ["Número", "Grupo", "Status", "Data de Cadastro", "Dia Atual", "Práticas Completadas", "Dias Perdidos", "Quais Dias Perdidos"],
      ...filtered.map((p) => {
        const progress = progressById.get(p.id);
        return [
          p.participantNumber,
          groupLabel,
          p.active ? "Ativo" : "Inativo",
          new Date(p.createdAt).toLocaleDateString("pt-BR"),
          progress?.currentDay == null
            ? "Não iniciou"
            : progress.currentDay > 28
              ? "Concluído"
              : String(progress.currentDay),
          progress?.completedCount ?? 0,
          progress?.missedDays.length ?? 0,
          (progress?.missedDays ?? []).join(", "),
        ];
      }),
    ]);
    toast.success(`Lista do grupo ${groupLabel} exportada com sucesso!`);
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
            <Button variant="outline" onClick={() => handleExportGroup("intervention")}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Intervenção
            </Button>
            <Button variant="outline" onClick={() => handleExportGroup("control")}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Controle
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
                      <TableHead className="text-right">Ações</TableHead>
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
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title={`Excluir participante ${participant.participantNumber}`}
                            onClick={() =>
                              setParticipantToDelete({
                                id: participant.id,
                                participantNumber: participant.participantNumber,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog
        open={participantToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setParticipantToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700">
              Excluir participante {participantToDelete?.participantNumber}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>irreversível</strong>. Serão excluídos o participante e{" "}
              <strong>todos os seus dados</strong>: respostas diárias, progresso de áudio e
              registros de cronômetro. Esses dados não aparecerão mais em relatórios nem
              nas exportações CSV/SPSS.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setParticipantToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (participantToDelete) {
                  deleteMutation.mutate({ participantId: participantToDelete.id });
                }
              }}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
