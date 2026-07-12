import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogOut, Bell, BellOff, Calendar, TrendingUp, Wifi, WifiOff, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
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
import AudioPlayer from "@/components/AudioPlayer";
import WellbeingScale from "@/components/WellbeingScale";
import ProgressPanel from "@/components/ProgressPanel";
import { useNotifications } from "@/hooks/useNotifications";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useBranding } from "@/hooks/useBranding";

export default function ParticipantApp() {
  const [, setLocation] = useLocation();
  // Usar estado React para participantId — evita re-render imediato ao remover do localStorage
  const [participantId] = useState<string | null>(() => localStorage.getItem("participantId"));

  const [wellbeingBefore, setWellbeingBefore] = useState<number | null>(null);
  const [wellbeingAfter, setWellbeingAfter] = useState<number | null>(null);
  const [currentActivity, setCurrentActivity] = useState("");
  const [showProgress, setShowProgress] = useState(false);
  // Controla se o participante escolheu pular o vídeo nesta sessão
  const [skippedVideoThisSession, setSkippedVideoThisSession] = useState(false);

  // Cronômetro para grupo controle
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  // Garante que a restauração do cronômetro salvo acontece uma única vez
  const timerRestoredRef = useRef(false);

  // Rastrear localmente se o participante iniciou e completou o áudio
  // useRef garante que o valor mais recente está sempre acessível em closures (sem stale closure)
  const [localAudioStarted, setLocalAudioStarted] = useState(false);
  const localAudioStartedRef = useRef(false);
  const [localAudioCompleted, setLocalAudioCompleted] = useState(false);
  const localAudioCompletedRef = useRef(false);
  // Áudio tocando neste instante (pausado = false) — controla a trava de navegação
  const [audioPlaying, setAudioPlaying] = useState(false);
  // Refs para evitar stale closure no handleLogoutRequest
  const timerSecondsRef = useRef(0);
  const hasCompletedTodayRef = useRef(false);
  const alreadyRespondedTodayRef = useRef(false);
  const participantRef = useRef<typeof participant>(undefined);

  // Estado de conclusão
  const [hasCompletedToday, setHasCompletedToday] = useState(false);

  // Controle do dialog de confirmação de saída
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const { permission: notificationPermission, requestPermission } = useNotifications();
  const { isOnline } = useOnlineStatus();
  const { loginTitle, researcherLine1, researcherLine2, logoUrl } = useBranding();

  const utils = trpc.useUtils();

  // Buscar dados do participante
  const { data: participant, isLoading: loadingParticipant } = trpc.participants.getByNumber.useQuery(
    { participantNumber: participantId || "" },
    { enabled: !!participantId }
  );

  // Buscar conteúdo
  const { data: welcomeVideo } = trpc.content.getWelcomeVideo.useQuery();
  const { data: audios } = trpc.content.getInterventionAudios.useQuery();
  const { data: controlInfo } = trpc.content.getControlInfo.useQuery(undefined, {
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Sempre buscar versão mais recente
  });

  // Buscar configurações de horário de acesso
  const { data: accessSettings } = trpc.settings.get.useQuery({ key: "access_hours" });

  // Buscar configuração de tempo de pausa do grupo controle
  const { data: pauseDurationSettings } = trpc.settings.get.useQuery({ key: "control_pause_duration" });

  // Tempo de pausa em segundos (padrão: 13 minutos = 780 segundos)
  const pauseDurationSeconds = pauseDurationSettings?.value
    ? parseInt(pauseDurationSettings.value) * 60
    : 780;

  // Buscar respostas do participante — o progresso é baseado em práticas completadas
  // (modelo de fases: o dia só avança quando a prática do dia anterior foi enviada)
  const { data: participantResponses, isLoading: loadingResponses } = trpc.responses.getByParticipant.useQuery(
    { participantId: participant?.id || 0 },
    { enabled: !!participant?.id }
  );

  const completedDays = (participantResponses ?? []).map(r => r.dayNumber);
  const completedCount = completedDays.length;

  // Ciclo completo: 28 práticas realizadas
  const hasFinishedStudy = completedCount >= 28;

  // Dia atual = próxima fase a completar
  const currentDay = Math.min(completedCount + 1, 28);

  // Já respondeu hoje? (apenas uma prática por dia de calendário)
  const todayStr = new Date().toDateString();
  const alreadyRespondedToday = (participantResponses ?? []).some(
    r => new Date(r.responseDate).toDateString() === todayStr
  );

  // Verificar progresso do áudio de hoje (grupo intervenção)
  const { data: audioProgressList, isFetched: audioProgressFetched } = trpc.audioProgress.getByParticipant.useQuery(
    { participantId: participant?.id || 0 },
    { enabled: !!participant?.id && participant?.group === "intervention" }
  );

  const audioProgressData = audioProgressList?.find(
    p => p.dayNumber === currentDay
  );

  // Apenas o progresso registrado HOJE conta para percentual, desbloqueio e retomada.
  // Progresso de dias anteriores na mesma fase (prática que não foi enviada) exige
  // reescutar o áudio — a fase recomeça a cada dia de calendário.
  const audioProgressToday =
    audioProgressData && new Date(audioProgressData.accessDate).toDateString() === new Date().toDateString()
      ? audioProgressData
      : undefined;

  // Percentual de progresso do áudio (0-100)
  const audioProgress = audioProgressToday?.percentageListened || 0;

  // Progresso de hoje registrado no servidor — sobrevive a recarregamentos da página:
  // se o participante já completou o áudio hoje, não precisa reescutar após um reload
  const audioStartedToday = localAudioStarted || audioProgress > 0;
  const audioCompletedToday = localAudioCompleted || (audioProgressToday?.completed ?? false);

  // Progresso do cronômetro salvo no servidor (grupo controle) — mesma regra do áudio:
  // apenas registro de HOJE conta; dia anterior recomeça do zero
  const { data: timerProgressList } = trpc.timerProgress.getByParticipant.useQuery(
    { participantId: participant?.id || 0 },
    { enabled: !!participant?.id && participant?.group === "control" }
  );

  // Mutations
  const submitResponseMutation = trpc.responses.create.useMutation({
    onSuccess: () => {
      toast.success("Resposta enviada com sucesso!");
      setHasCompletedToday(true);
      utils.responses.getByParticipant.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao enviar resposta");
    },
  });

  const saveAudioProgressMutation = trpc.audioProgress.save.useMutation({
    onSuccess: () => {
      // Invalidar cache para atualizar audioProgress imediatamente
      utils.audioProgress.getByParticipant.invalidate();
    },
  });

  const saveTimerProgressMutation = trpc.timerProgress.save.useMutation();

  const handleLogout = () => {
    // Navegar primeiro, remover do localStorage depois — evita re-render que cancela o dialog
    setLocation("/participant/login");
    setTimeout(() => localStorage.removeItem("participantId"), 100);
  };

  // handleLogoutRequest lê EXCLUSIVAMENTE dos refs para evitar qualquer stale closure
  const handleLogoutRequest = () => {
    const p = participantRef.current;
    const audioStarted = localAudioStartedRef.current;
    const timerSecs = timerSecondsRef.current;
    const completed = hasCompletedTodayRef.current;
    const responded = alreadyRespondedTodayRef.current;
    const group = p?.group;

    const hasProgress = !completed && !responded && !!p && (
      (group === "intervention" && audioStarted) ||
      (group === "control" && timerSecs > 0)
    );

    if (hasProgress) {
      setShowLogoutDialog(true);
    } else {
      handleLogout();
    }
  };

  // Atualizar refs INLINE durante o render (não via useEffect) — garante que sempre refletem o valor atual
  // quando handleLogoutRequest for chamado, mesmo que seja logo após o render
  localAudioStartedRef.current = localAudioStarted;
  localAudioCompletedRef.current = localAudioCompleted;
  timerSecondsRef.current = timerSeconds;
  hasCompletedTodayRef.current = hasCompletedToday;
  alreadyRespondedTodayRef.current = alreadyRespondedToday;
  participantRef.current = participant;

  // Detectar se há progresso não enviado (para o banner visual e beforeunload)
  // Usa audioStartedToday: após um reload, o progresso salvo no servidor também conta
  const hasUnsavedProgress = !hasCompletedToday && !alreadyRespondedToday && !!participant && (
    (participant.group === "intervention" && audioStartedToday) ||
    (participant.group === "control" && timerSeconds > 0)
  );

  // Atividade em andamento NESTE INSTANTE — bloqueia sair e "Ver Progresso" apenas
  // enquanto o áudio toca ou o cronômetro corre; pausou, libera (igual nos dois grupos).
  // Navegar com áudio pausado é seguro: o progresso é salvo no pause e o player retoma da posição
  const activityInProgress =
    (participant?.group === "intervention" && audioPlaying && !audioCompletedToday) ||
    (participant?.group === "control" && timerRunning && timerSeconds < pauseDurationSeconds);

  // Interceptar fechamento de aba/browser quando há progresso não enviado
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedProgress) {
        e.preventDefault();
        e.returnValue = "Você ainda não enviou sua resposta de hoje. Deseja sair mesmo assim?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedProgress]);

  // Solicitar permissão de notificações após 3 segundos (apenas uma vez, silenciosamente)
  useEffect(() => {
    if (notificationPermission === "default") {
      const timer = setTimeout(() => {
        // silent=true: não exibe toast de erro se o navegador não suportar
        requestPermission(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
    // Não incluir requestPermission nas dependências: é estabilizado com useCallback
    // e incluí-lo causaria re-disparo desnecessário em cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationPermission]);

  // Cronômetro para grupo controle
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timerSeconds < 900) { // 15 minutos = 900 segundos
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  // Restaurar o cronômetro salvo no servidor (uma única vez, apenas registro de hoje)
  useEffect(() => {
    if (timerRestoredRef.current) return;
    if (!timerProgressList || participant?.group !== "control") return;
    timerRestoredRef.current = true;

    const savedToday = timerProgressList.find(
      p => p.dayNumber === currentDay && new Date(p.accessDate).toDateString() === new Date().toDateString()
    );
    // Não sobrescrever se o participante já iniciou o cronômetro nesta sessão
    if (savedToday && savedToday.secondsElapsed > 0 && timerSeconds === 0 && !timerRunning) {
      setTimerSeconds(Math.min(savedToday.secondsElapsed, 900));
    }
  }, [timerProgressList, participant, currentDay, timerSeconds, timerRunning]);

  // Salvar progresso do cronômetro: heartbeat a cada 5s enquanto corre + valor exato ao pausar
  useEffect(() => {
    if (!participant || participant.group !== "control") return;
    if (timerSeconds === 0 || !isOnline) return;
    if (timerRunning && timerSeconds % 5 !== 0) return;

    saveTimerProgressMutation.mutate({
      participantId: participant.id,
      dayNumber: currentDay,
      secondsElapsed: timerSeconds,
      accessDate: new Date(),
    });
    // saveTimerProgressMutation fora das dependências: identidade muda a cada estado da mutation
    // e incluí-la dispararia salvamentos duplicados
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerSeconds, timerRunning, participant, currentDay, isOnline]);

  // Redirecionar via useEffect (não no render) para evitar cancelar dialogs abertos
  useEffect(() => {
    if (!participantId) {
      setLocation("/participant/login");
    }
  }, [participantId, setLocation]);

  const handleSubmitResponse = async () => {
    if (!participant) return;

    if (wellbeingBefore === null) {
      toast.error("Por favor, indique como você se sente ANTES da pausa");
      return;
    }

    if (wellbeingAfter === null) {
      toast.error("Por favor, indique como você se sente DEPOIS da pausa");
      return;
    }

    if (!currentActivity.trim()) {
      toast.error("Por favor, descreva o que você está fazendo no momento");
      return;
    }

    if (!isOnline) {
      toast.error("Sem conexão à internet. Conecte-se ao Wi-Fi ou dados móveis e tente novamente.");
      return;
    }

    submitResponseMutation.mutate({
      participantId: participant.id,
      wellbeingBefore,
      wellbeingAfter,
      pauseDuration: participant.group === "control" ? timerSeconds : null,
      currentActivity,
      responseDate: new Date(),
    });
  };

  const handleAudioProgress = useCallback(async (audioNumber: number, percentListened: number, lastPosition: number, completed: boolean) => {
    if (!participant) return;
    // Marcar localmente que o áudio foi iniciado (para o guard de saída)
    if (percentListened > 0) {
      setLocalAudioStarted(true);
      localAudioStartedRef.current = true;
    }
    // Marcar localmente que o áudio foi completado (para habilitar carinhas "depois")
    if (completed || percentListened >= 99) {
      setLocalAudioCompleted(true);
      localAudioCompletedRef.current = true;
    }

    // Registrar progresso no servidor (requer conexão; sem conexão o estado local mantém a UX)
    if (isOnline) {
      await saveAudioProgressMutation.mutateAsync({
        participantId: participant.id,
        audioNumber,
        dayNumber: currentDay,
        percentageListened: percentListened,
        lastPosition,
        completed,
        accessDate: new Date(),
      });
    }

    // NÃO marcar como concluído automaticamente
    // Apenas quando o usuário clicar em "Enviar Resposta"
  }, [participant, currentDay, isOnline, saveAudioProgressMutation]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loadingParticipant || (!!participant && loadingResponses)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!participantId) {
    return null;
  }

  if (!participant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Erro</CardTitle>
            <CardDescription>Participante não encontrado</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogoutRequest} variant="outline" className="w-full">
              Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ciclo de 28 dias concluído — encerramento da participação
  if (hasFinishedStudy) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <Card className="max-w-md border-green-300">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="text-5xl">🏆</div>
            </div>
            <CardTitle className="text-green-900">Pesquisa Concluída!</CardTitle>
            <CardDescription>Você completou todos os 28 dias</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-center text-green-900 font-medium">
                Parabéns! Sua participação na pesquisa foi concluída com sucesso.
                Obrigado pela sua dedicação!
              </p>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              <p>28 de 28 dias completados</p>
            </div>
            <div className="flex justify-center">
              <Button onClick={handleLogout} variant="outline" className="w-full max-w-xs">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verificar horário de acesso
  const currentHour = new Date().getHours();

  // Carregar configurações de horário (padrão: 10h-18h, habilitado)
  let accessRestrictionEnabled = true;
  let startHour = 10;
  let endHour = 18;

  if (accessSettings?.value) {
    try {
      const parsed = JSON.parse(accessSettings.value);
      accessRestrictionEnabled = parsed.enabled ?? true;
      startHour = parsed.startHour ?? 10;
      endHour = parsed.endHour ?? 18;
    } catch (e) {
      console.error("Error parsing access settings:", e);
    }
  }

  const isAccessAllowed = !accessRestrictionEnabled || (currentHour >= startHour && currentHour < endHour);

  if (!isAccessAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-100 p-4">
        <Card className="max-w-md border-orange-300">
          <CardHeader>
            <CardTitle className="text-orange-900">Horário de Acesso Restrito</CardTitle>
            <CardDescription>O aplicativo está disponível apenas das {startHour}h às {endHour}h</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Horário atual: {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-sm text-muted-foreground">
              Volte entre {startHour}h e {endHour}h para acessar o aplicativo.
            </p>
            <Button onClick={handleLogoutRequest} variant="outline" className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calcular qual áudio usar (1-4 baseado na fase atual)
  const audioNumber = Math.ceil(currentDay / 7); // Dia 1-7 = Áudio 1, Dia 8-14 = Áudio 2, etc.
  const currentAudio = audios?.find(a => a.audioNumber === audioNumber);

  // Verificar se já completou hoje (apenas se enviou resposta)
  const isCompleted = hasCompletedToday || alreadyRespondedToday;

  // Se já completou hoje, mostrar mensagem de parabéns
  if (isCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <Card className="max-w-md border-green-300">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
            </div>
            <CardTitle className="text-green-900">Parabéns!</CardTitle>
            <CardDescription>Você completou sua atividade de hoje</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-center text-green-900 font-medium">
                Parabéns por ter feito sua pausa, volte amanhã novamente!
              </p>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              <p>{completedCount} de 28 dias completados</p>
              <p className="mt-2">Continue assim! Sua dedicação é importante para a pesquisa.</p>
            </div>
            <div className="flex justify-center">
              <Button onClick={handleLogoutRequest} variant="outline" className="w-full max-w-xs">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Banner de conexão offline */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-2.5 flex items-center justify-center gap-2 shadow-lg">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">
            Sem conexão à internet — conecte-se ao Wi-Fi ou dados móveis para continuar
          </span>
        </div>
      )}
      {/* Espaço reservado para o banner não sobrepor o header */}
      {!isOnline && <div className="h-10" />}

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-12 w-12 object-contain rounded-full"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.3))' }}
                />
              )}
              <div>
                <h1 className="text-base font-bold text-gray-900">{loginTitle}</h1>
                <p className="text-xs text-gray-600">{researcherLine1}</p>
                <p className="text-xs text-gray-600">{researcherLine2}</p>
                <p className="text-xs text-gray-500 mt-1">Participante: {participant.participantNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-orange-600" />
              )}
              {notificationPermission === "granted" ? (
                <Bell className="h-5 w-5 text-green-600" />
              ) : (
                <BellOff className="h-5 w-5 text-gray-400" />
              )}
{/* Bloquear logout durante áudio (intervenção) ou cronometro rodando (controle) */}
              {activityInProgress ? (
                <div className="relative group">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    className="opacity-40 cursor-not-allowed"
                    title={participant.group === "control" ? "Complete a pausa antes de sair" : "Complete o áudio antes de sair"}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                  <div className="absolute right-0 top-8 z-50 hidden group-hover:block bg-orange-700 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                    {participant.group === "control" ? "Complete a pausa antes de sair" : "Complete o áudio antes de sair"}
                  </div>
                </div>
              ) : (
                <Button onClick={handleLogoutRequest} variant="ghost" size="sm">
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Dialog de confirmação de saída com progresso não enviado */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Você ainda não enviou sua resposta!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Se sair agora, <strong>seu progresso de hoje não será registrado</strong> na pesquisa.
              <br /><br />
              Recomendamos que você complete a atividade e envie a resposta antes de sair.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col">
            <AlertDialogCancel onClick={() => setShowLogoutDialog(false)} className="w-full">
              Continuar escutando
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              Sair sem enviar resposta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {welcomeVideo && !skippedVideoThisSession ? (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Assista ao Vídeo Introdutório</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <video
                controls
                className="w-full rounded-lg"
                playsInline
                webkit-playsinline="true"
                preload="auto"
                controlsList="nodownload"
                style={{ maxHeight: '400px' }}
              >
                <source src={welcomeVideo.fileUrl || ""} type="video/mp4" />
                Seu navegador não suporta a reprodução de vídeo.
              </video>
              <Button
                onClick={() => {
                  setSkippedVideoThisSession(true);
                  localStorage.setItem(`video_watched_${participantId}`, 'true');
                }}
                className="w-full"
                size="lg"
              >
                Ir para as Práticas
              </Button>
            </CardContent>
          </Card>
        ) : showProgress ? (
          <Card>
            <CardHeader>
              <CardTitle>Seu Progresso</CardTitle>
              <CardDescription>Acompanhe sua jornada de 28 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <ProgressPanel
                currentDay={currentDay}
                completedDays={completedDays}
              />
              <Button onClick={() => setShowProgress(false)} variant="outline" className="w-full mt-4">
                Fechar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Aviso de resposta não enviada */}
            {hasUnsavedProgress && (
              <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-800">Não se esqueça de enviar sua resposta!</p>
                  <p className="text-sm text-orange-700 mt-1">
                    Você já {participant?.group === "intervention" ? "começou a escutar o áudio" : "iniciou o cronômetro"} mas ainda não enviou sua resposta de hoje.
                    Role a página para baixo, preencha as perguntas e clique em <strong>Enviar Resposta</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Dia Atual */}
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <CardTitle>Dia {currentDay} de 28</CardTitle>
                </div>
                <CardDescription>
                  {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                </CardDescription>
                <Button
                  onClick={() => setShowProgress(true)}
                  variant="ghost"
                  size="sm"
                  disabled={activityInProgress}
                  className={activityInProgress ? "mx-auto opacity-40 cursor-not-allowed" : "mx-auto text-blue-600"}
                  title={activityInProgress
                    ? (participant.group === "control" ? "Complete a pausa antes de ver o progresso" : "Complete o áudio antes de ver o progresso")
                    : undefined}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Ver Progresso
                </Button>
              </CardHeader>
            </Card>

            {/* Conteúdo Principal */}
            <Card>
              <CardHeader>
                <CardTitle>Sua Atividade de Hoje</CardTitle>
                <CardDescription>
                  Complete a atividade e responda as perguntas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Bem-estar ANTES */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    Como você se sente agora ANTES da pausa?
                  </Label>
                  <WellbeingScale
                    value={wellbeingBefore}
                    onChange={setWellbeingBefore}
                  />
                </div>

                {/* Conteúdo baseado no grupo */}
                {participant.group === "intervention" ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h3 className="font-semibold text-blue-900 mb-2">Áudio de Pausa</h3>
                      <p className="text-sm text-blue-700 mb-4">
                        Ouça o áudio completo para sua pausa guiada
                      </p>
                      {/* Aguardar o fetch do progresso para montar o player já com a posição de retomada */}
                      {currentAudio && audioProgressFetched && (
                        <AudioPlayer
                          audioUrl={currentAudio.fileUrl || ""}
                          audioNumber={audioNumber}
                          dayNumber={currentDay}
                          initialPosition={audioProgressToday?.lastPosition || 0}
                          onProgressUpdate={(percent: number, position: number, completed: boolean) =>
                            handleAudioProgress(audioNumber, percent, position, completed)
                          }
                          onPlayingChange={setAudioPlaying}
                          onPlay={() => {
                            setLocalAudioStarted(true);
                            localAudioStartedRef.current = true; // atualizar ref imediatamente
                          }}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="font-semibold text-green-900 mb-2">Instruções para Hoje</h3>
                      <p className="text-sm text-green-800 whitespace-pre-wrap">
                        {controlInfo?.fileUrl || "Pratique 15 minutos de pausa consciente"}
                      </p>
                    </div>

                    {/* Cronômetro */}
                    <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
                      <div className="text-center space-y-4">
                        <div className="flex justify-center">
                          <Clock className="h-8 w-8 text-gray-600" />
                        </div>
                        <div className="text-4xl font-bold text-gray-900 font-mono">
                          {formatTime(timerSeconds)}
                        </div>
                        <p className="text-sm text-gray-600">
                          Tempo de pausa (mínimo {Math.floor(pauseDurationSeconds / 60)} minutos)
                        </p>
                        {!timerRunning ? (
                          <Button
                            onClick={() => setTimerRunning(true)}
                            className="w-full"
                            size="lg"
                          >
                            Iniciar Cronômetro
                          </Button>
                        ) : (
                          <Button
                            onClick={() => setTimerRunning(false)}
                            variant="outline"
                            className="w-full"
                            size="lg"
                          >
                            Pausar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bem-estar DEPOIS */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    Como você se sente agora DEPOIS da pausa?
                  </Label>

                  {/* Mostrar aviso se ainda não completou os requisitos */}
                  {participant.group === "control" && timerSeconds < pauseDurationSeconds && (
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-2">
                      <p className="text-xs text-yellow-800">
                        ⚠️ Complete {Math.floor(pauseDurationSeconds / 60)} minutos de pausa antes de responder (faltam {formatTime(pauseDurationSeconds - timerSeconds)})
                      </p>
                    </div>
                  )}

                  {participant.group === "intervention" && !audioCompletedToday && (
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-2">
                      <p className="text-xs text-yellow-800">
                        ⚠️ Complete o áudio antes de responder
                      </p>
                    </div>
                  )}

                  <WellbeingScale
                    value={wellbeingAfter}
                    onChange={setWellbeingAfter}
                    disabled={
                      (participant.group === "intervention" && !audioCompletedToday) ||
                      (participant.group === "control" && timerSeconds < pauseDurationSeconds)
                    }
                  />
                </div>

                {/* Atividade Atual */}
                <div className="space-y-3">
                  <Label htmlFor="activity" className="text-base font-semibold">
                    O que você está fazendo neste momento?
                  </Label>
                  <Textarea
                    id="activity"
                    placeholder="Descreva brevemente sua atividade atual..."
                    value={currentActivity}
                    onChange={(e) => setCurrentActivity(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Botão de Envio */}
                <Button
                  onClick={handleSubmitResponse}
                  className="w-full"
                  size="lg"
                  disabled={
                    submitResponseMutation.isPending ||
                    wellbeingBefore === null ||
                    wellbeingAfter === null ||
                    !currentActivity.trim() ||
                    (participant.group === "intervention" && !audioCompletedToday) ||
                    (participant.group === "control" && timerSeconds < pauseDurationSeconds)
                  }
                >
                  {submitResponseMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </>
                  ) : (participant.group === "intervention" && !audioCompletedToday) ? (
                    `Aguarde completar o áudio (${Math.round(audioProgress)}%)`
                  ) : (participant.group === "control" && timerSeconds < pauseDurationSeconds) ? (
                    `Aguarde ${Math.floor(pauseDurationSeconds / 60)} minutos (${formatTime(timerSeconds)}/${formatTime(pauseDurationSeconds)})`
                  ) : (
                    "Enviar Resposta"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
