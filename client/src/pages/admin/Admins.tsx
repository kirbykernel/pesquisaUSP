import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ShieldCheck, UserPlus, Trash2, Mail, CheckCircle, Clock, Crown } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminAdmins() {
  const [emailInput, setEmailInput] = useState("");

  const { data: invites, refetch: refetchInvites, isLoading: loadingInvites } = trpc.adminInvites.list.useQuery();
  const { data: admins, refetch: refetchAdmins, isLoading: loadingAdmins } = trpc.adminInvites.listAdmins.useQuery();

  const inviteMutation = trpc.adminInvites.invite.useMutation({
    onSuccess: () => {
      toast.success("Convite enviado! A pessoa terá acesso de admin ao fazer login com este email.");
      setEmailInput("");
      refetchInvites();
    },
    onError: (err) => {
      if (err.data?.code === "CONFLICT") {
        toast.error("Este email já foi convidado.");
      } else {
        toast.error("Erro ao enviar convite: " + err.message);
      }
    },
  });

  const revokeMutation = trpc.adminInvites.revoke.useMutation({
    onSuccess: () => {
      toast.success("Convite removido.");
      refetchInvites();
      refetchAdmins();
    },
    onError: () => toast.error("Erro ao remover convite."),
  });

  const handleInvite = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Por favor, insira um email válido.");
      return;
    }
    inviteMutation.mutate({ email });
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Administradores</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie quem tem acesso ao painel administrativo
            </p>
          </div>
        </div>

        {/* Invite form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4" />
              Convidar novo administrador
            </CardTitle>
            <CardDescription>
              Insira o email da conta Manus da pessoa. Na próxima vez que ela fizer login, receberá acesso de administrador automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                className="flex-1"
              />
              <Button
                onClick={handleInvite}
                disabled={inviteMutation.isPending || !emailInput.trim()}
              >
                {inviteMutation.isPending ? "Enviando..." : "Convidar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current admins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-4 w-4 text-amber-500" />
              Administradores ativos
            </CardTitle>
            <CardDescription>
              Usuários que já têm acesso de administrador ao painel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAdmins ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : !admins || admins.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum administrador encontrado.</p>
            ) : (
              <div className="space-y-2">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-3 bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-amber-700">
                          {admin.name?.charAt(0).toUpperCase() ?? "?"}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{admin.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{admin.email ?? "—"}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                      Admin
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending invites */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4" />
              Convites pendentes
            </CardTitle>
            <CardDescription>
              Emails convidados que ainda não fizeram login. O acesso será concedido automaticamente no primeiro login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingInvites ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : !invites || invites.filter(i => !i.accepted).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum convite pendente.</p>
            ) : (
              <div className="space-y-2">
                {invites.filter(i => !i.accepted).map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{invite.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Convidado por {invite.invitedByName ?? "admin"} · {new Date(invite.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-blue-600 border-blue-200">
                        Pendente
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover convite?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O email <strong>{invite.email}</strong> não terá mais acesso de administrador ao fazer login.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => revokeMutation.mutate({ id: invite.id })}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accepted invites */}
        {invites && invites.filter(i => i.accepted).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Convites aceitos
              </CardTitle>
              <CardDescription>
                Emails que já fizeram login e receberam acesso de administrador.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {invites.filter(i => i.accepted).map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-3 bg-green-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{invite.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Aceito em {invite.acceptedAt ? new Date(invite.acceptedAt).toLocaleDateString("pt-BR") : "—"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      Aceito
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
