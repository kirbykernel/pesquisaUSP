import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Users, UserCheck, UserX, Activity } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.participants.stats.useQuery();
  const { data: settings } = trpc.settings.getFormatted.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral da pesquisa
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Participantes
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Cadastrados no sistema
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Grupo Intervenção
                </CardTitle>
                <Activity className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.intervention || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.total ? Math.round((stats.intervention / stats.total) * 100) : 0}% do total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Grupo Controle
                </CardTitle>
                <Activity className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats?.control || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.total ? Math.round((stats.control / stats.total) * 100) : 0}% do total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Participantes Ativos
                </CardTitle>
                <UserCheck className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {stats?.active || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.inactive || 0} inativos
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Sobre a Pesquisa</CardTitle>
              <CardDescription>
                Sistema de coleta de dados para pesquisa com residentes de medicina
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Duração:</span>
                <span className="font-medium">28 dias</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Áudios (Intervenção):</span>
                <span className="font-medium">4 áudios</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Coleta Diária:</span>
                <span className="font-medium">Bem-estar + Atividade</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Horário de Acesso:</span>
                <span className="font-medium">
                  {settings?.accessTimeEnabled 
                    ? `${settings?.accessStartHour || 10}h às ${settings?.accessEndHour || 18}h`
                    : "Sem restrição (testes)"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Próximos Passos</CardTitle>
              <CardDescription>
                Configure o sistema antes de iniciar a pesquisa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Cadastrar Participantes</p>
                  <p className="text-xs text-muted-foreground">
                    Crie os números de identificação e randomize os grupos
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Upload de Conteúdo</p>
                  <p className="text-xs text-muted-foreground">
                    Faça upload do vídeo, áudios e informações
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Distribuir Números</p>
                  <p className="text-xs text-muted-foreground">
                    Entregue os números de identificação aos participantes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
