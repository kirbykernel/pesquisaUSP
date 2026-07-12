import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Play, Pause } from "lucide-react";
import { useEffect, useRef, useState, memo } from "react";

interface AudioPlayerProps {
  audioUrl: string;
  audioNumber: number;
  dayNumber: number;
  onProgressUpdate: (percentage: number, position: number, completed: boolean) => void;
  onPlay?: () => void; // Chamado imediatamente quando o participante dá play
  onPlayingChange?: (playing: boolean) => void; // Notifica play/pause (inclui pausas do sistema, ex: ligação)
  initialPosition?: number; // Posição salva no servidor (segundos) para retomar de onde parou
}

// Detectar Safari uma única vez (fora do componente para evitar re-renders)
const isSafari = typeof window !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

function AudioPlayer({
  audioUrl,
  audioNumber,
  dayNumber,
  onProgressUpdate,
  onPlay,
  onPlayingChange,
  initialPosition,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Posição de retomada capturada na montagem (atualizações posteriores da prop são ignoradas)
  const initialPositionRef = useRef(initialPosition ?? 0);
  const initialSeekAppliedRef = useRef(false);
  // Ref para o callback de play/pause — evita re-registrar listeners quando a prop muda
  const onPlayingChangeRef = useRef(onPlayingChange);
  onPlayingChangeRef.current = onPlayingChange;

  // Retomar do ponto salvo — aplicado uma única vez, assim que a duração é conhecida
  const applyInitialSeek = (audio: HTMLAudioElement) => {
    if (initialSeekAppliedRef.current) return;
    if (!audio.duration || !isFinite(audio.duration)) return;
    const pos = initialPositionRef.current;
    // Só retomar se a posição é válida e não está no finalzinho do áudio
    if (pos > 0 && pos < audio.duration - 1) {
      audio.currentTime = pos;
      setCurrentTime(pos);
      setPercentage((pos / audio.duration) * 100);
    }
    initialSeekAppliedRef.current = true;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;



    const handleLoadedMetadata = () => {

      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        setMetadataLoaded(true);
        applyInitialSeek(audio);
      }
    };

    const handleTimeUpdate = () => {
      if (!audio.duration || !isFinite(audio.duration)) return;
      
      setCurrentTime(audio.currentTime);
      const percent = (audio.currentTime / audio.duration) * 100;
      setPercentage(percent);

      // Salvar progresso a cada 5 segundos
      if (Math.floor(audio.currentTime) % 5 === 0) {
        const completed = percent >= 99;
        onProgressUpdate(Math.floor(percent), Math.floor(audio.currentTime), completed);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (audio.duration && isFinite(audio.duration)) {
        onProgressUpdate(100, Math.floor(audio.duration), true);
      }
    };

    const handleCanPlay = () => {

      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        setMetadataLoaded(true);
        applyInitialSeek(audio);
      }
    };

    const handleError = () => {
      // Erro silencioso - não precisa logar
    };

    // Sincronizar com o estado real do elemento (cobre pausas do sistema, ex: ligação recebida)
    const handlePlayEvent = () => {
      setIsPlaying(true);
      onPlayingChangeRef.current?.(true);
    };

    const handlePauseEvent = () => {
      setIsPlaying(false);
      onPlayingChangeRef.current?.(false);
      // Salvar o progresso exato no momento do pause (sem esperar o próximo heartbeat de 5s)
      if (audio.duration && isFinite(audio.duration) && audio.currentTime > 0 && !audio.ended) {
        const percent = (audio.currentTime / audio.duration) * 100;
        onProgressUpdate(Math.floor(percent), Math.floor(audio.currentTime), percent >= 99);
      }
    };





    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);

    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlayEvent);
    audio.addEventListener('pause', handlePauseEvent);

    // Safari: NÃO forçar load() automaticamente para evitar interrupções
    // O load() será chamado apenas quando o usuário clicar em Play

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);

      audio.removeEventListener('error', handleError);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlayEvent);
      audio.removeEventListener('pause', handlePauseEvent);
    };
  }, [onProgressUpdate]);

  // Intervalo para forçar atualização visual
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        const audio = audioRef.current;
        if (audio && audio.duration && isFinite(audio.duration) && audio.duration > 0) {
          setCurrentTime(audio.currentTime);
          const percent = (audio.currentTime / audio.duration) * 100;
          setPercentage(percent);
        }
      }, 500);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        // Retomar do ponto salvo caso os metadados já estejam disponíveis
        applyInitialSeek(audio);
        // Safari: tocar diretamente sem load() para evitar interrupções
        await audio.play();
        setIsPlaying(true);
        // Notificar imediatamente que o áudio foi iniciado (para o guard de saída)
        onPlay?.();

        // Verificar duração após começar a tocar (fallback)
        if (!metadataLoaded && audio.duration && isFinite(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
          setMetadataLoaded(true);
        }
      } catch (error) {
        console.error('[AudioPlayer] Erro ao reproduzir áudio:', error);
        // Tentar novamente sem aguardar metadados
        try {
          await audio.play();
          setIsPlaying(true);
        } catch (retryError) {
          console.error('[AudioPlayer] Falha ao reproduzir áudio após retry:', retryError);
        }
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Áudio {audioNumber} - Dia {dayNumber}</span>
            <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>

          <Progress value={percentage} className="h-2" />

          <div className="flex items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={togglePlay}
              className="rounded-full h-16 w-16"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-1" />
              )}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium">
              {percentage >= 99 ? '✓ Áudio completado!' : `${Math.floor(percentage)}% escutado`}
            </p>
          </div>

          <audio
            ref={audioRef}
            src={audioUrl}
            preload="metadata"
            playsInline
            crossOrigin="anonymous"
            controlsList="nodownload noplaybackrate"
          />

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>• Não é possível acelerar ou pular o áudio</p>
            <p>• Seu progresso é salvo automaticamente</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Usar React.memo para evitar re-renders desnecessários
export default memo(AudioPlayer);
