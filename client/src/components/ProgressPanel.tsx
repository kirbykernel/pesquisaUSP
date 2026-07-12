import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Flame, TrendingUp, Award, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressPanelProps {
  currentDay: number;
  completedDays: number[];
  totalDays?: number;
}

export default function ProgressPanel({ 
  currentDay, 
  completedDays,
  totalDays = 28 
}: ProgressPanelProps) {
  // Calcular estatísticas
  const daysCompleted = completedDays.length;
  const percentageComplete = Math.round((daysCompleted / totalDays) * 100);
  
  // Calcular streak (sequência consecutiva)
  const calculateStreak = () => {
    if (completedDays.length === 0) return 0;
    
    const sorted = [...completedDays].sort((a, b) => b - a);
    let streak = 0;
    let expectedDay = currentDay;
    
    for (const day of sorted) {
      if (day === expectedDay || day === expectedDay - 1) {
        streak++;
        expectedDay = day - 1;
      } else {
        break;
      }
    }
    
    return streak;
  };
  
  const currentStreak = calculateStreak();
  
  // Verificar conquistas
  const achievements = [
    { days: 7, label: "1 Semana", unlocked: daysCompleted >= 7, icon: "🎯" },
    { days: 14, label: "2 Semanas", unlocked: daysCompleted >= 14, icon: "🌟" },
    { days: 21, label: "3 Semanas", unlocked: daysCompleted >= 21, icon: "💎" },
    { days: 28, label: "Completo!", unlocked: daysCompleted >= 28, icon: "🏆" },
  ];
  
  // Organizar dias em semanas
  const weeks = [];
  for (let i = 0; i < totalDays; i += 7) {
    weeks.push(Array.from({ length: 7 }, (_, j) => i + j + 1).filter(d => d <= totalDays));
  }

  return (
    <div className="space-y-4">
      {/* Estatísticas Principais */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-6 pb-4">
            <div className="flex flex-col items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div className="text-2xl font-bold">{daysCompleted}</div>
              <div className="text-xs text-muted-foreground text-center">
                Dias Completados
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 pb-4">
            <div className="flex flex-col items-center gap-2">
              <Flame className="h-5 w-5 text-orange-600" />
              <div className="text-2xl font-bold">{currentStreak}</div>
              <div className="text-xs text-muted-foreground text-center">
                Sequência Atual
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 pb-4">
            <div className="flex flex-col items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div className="text-2xl font-bold">{percentageComplete}%</div>
              <div className="text-xs text-muted-foreground text-center">
                Progresso
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Progresso */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progresso Geral</span>
              <span className="text-muted-foreground">{daysCompleted} de {totalDays} dias</span>
            </div>
            <Progress value={percentageComplete} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Calendário Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Calendário de 28 Dias</CardTitle>
          <CardDescription>
            Acompanhe seu progresso dia a dia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Semana {weekIndex + 1}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {week.map((day) => {
                    const isCompleted = completedDays.includes(day);
                    const isCurrent = day === currentDay;
                    const isPast = day < currentDay;
                    
                    return (
                      <div
                        key={day}
                        className={cn(
                          "aspect-square flex flex-col items-center justify-center rounded-lg border-2 transition-all",
                          isCompleted && "bg-green-50 border-green-500",
                          isCurrent && !isCompleted && "bg-blue-50 border-blue-500 ring-2 ring-blue-200",
                          !isCompleted && !isCurrent && isPast && "bg-red-50 border-red-300",
                          !isCompleted && !isCurrent && !isPast && "bg-gray-50 border-gray-200"
                        )}
                      >
                        <div className="text-xs font-bold">
                          {day}
                        </div>
                        {isCompleted && (
                          <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5" />
                        )}
                        {isCurrent && !isCompleted && (
                          <Circle className="h-3 w-3 text-blue-600 mt-0.5 fill-blue-600" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-50"></div>
              <span>Completado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded border-2 border-blue-500 bg-blue-50"></div>
              <span>Hoje</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded border-2 border-red-300 bg-red-50"></div>
              <span>Perdido</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded border-2 border-gray-200 bg-gray-50"></div>
              <span>Futuro</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conquistas */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-600" />
            <CardTitle className="text-lg">Conquistas</CardTitle>
          </div>
          <CardDescription>
            Desbloqueie marcos conforme progride
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {achievements.map((achievement) => (
              <div
                key={achievement.days}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                  achievement.unlocked
                    ? "bg-yellow-50 border-yellow-400"
                    : "bg-gray-50 border-gray-200 opacity-50"
                )}
              >
                <div className="text-3xl">{achievement.icon}</div>
                <div className="text-sm font-medium text-center">
                  {achievement.label}
                </div>
                {achievement.unlocked && (
                  <Badge variant="secondary" className="text-xs">
                    Desbloqueado!
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mensagem Motivacional */}
      {currentStreak >= 3 && (
        <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Flame className="h-8 w-8 text-orange-600" />
              <div>
                <div className="font-bold text-orange-900">
                  🔥 Você está em chamas!
                </div>
                <div className="text-sm text-orange-700">
                  {currentStreak} dias consecutivos! Continue assim!
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {daysCompleted === totalDays && (
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="text-5xl">🏆</div>
              <div className="font-bold text-green-900 text-lg">
                Parabéns! Você completou todos os 28 dias!
              </div>
              <div className="text-sm text-green-700">
                Obrigado por sua dedicação à pesquisa!
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
