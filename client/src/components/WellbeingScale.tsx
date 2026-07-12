import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WellbeingScaleProps {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const faces = [
  { value: 1, emoji: "😢", label: "Muito mal", color: "text-red-500" },
  { value: 2, emoji: "😟", label: "Mal", color: "text-orange-500" },
  { value: 3, emoji: "😐", label: "Neutro", color: "text-yellow-500" },
  { value: 4, emoji: "🙂", label: "Bem", color: "text-lime-500" },
  { value: 5, emoji: "😄", label: "Muito bem", color: "text-green-500" },
];

export default function WellbeingScale({ value, onChange, disabled = false }: WellbeingScaleProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Como você está se sentindo hoje?</CardTitle>
        <CardDescription>
          Selecione a opção que melhor representa seu bem-estar neste momento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2">
          {faces.map((face) => (
            <button
              key={face.value}
              onClick={() => !disabled && onChange(face.value)}
              disabled={disabled}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                disabled && "opacity-50 cursor-not-allowed",
                value === face.value
                  ? "border-primary bg-primary/10 scale-105"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              <span className={cn("text-4xl", face.color)}>{face.emoji}</span>
              <span className="text-xs font-medium text-center">{face.label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
