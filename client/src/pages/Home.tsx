import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_LOGO } from "@/const";
import { Users, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useBranding } from "@/hooks/useBranding";

export default function Home() {
  const { appTitle, loginTitle, researcherLine1, researcherLine2, logoUrl } = useBranding();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{appTitle}</h1>
          </div>

        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto mb-16">
          <div className="flex items-center justify-center gap-8 mb-8">
            {/* Logo PAUSA — só renderizar após carregar para evitar flash do logo antigo */}
            {logoUrl && (
              <div className="flex-shrink-0">
                <img 
                  src={logoUrl} 
                  alt="Logo PAUSA" 
                  className="h-32 w-32 object-contain rounded-full shadow-lg"
                  style={{ filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.5))' }}
                />
              </div>
            )}
            
            {/* Título e Autores */}
            <div className="text-left">
              <h2 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {loginTitle}
              </h2>
              <p className="text-base text-gray-700 mb-1">
                {researcherLine1}
              </p>
              <p className="text-base text-gray-700">
                {researcherLine2}
              </p>
            </div>
          </div>
          
          <p className="text-lg text-muted-foreground text-center">
            Sistema completo para coleta de dados de pesquisa com grupos de intervenção e controle
          </p>
        </div>

        {/* Card Participante - centralizado */}
        <div className="flex justify-center max-w-4xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow w-full max-w-sm">
            <CardHeader>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Acessar o Aplicativo</CardTitle>
              <CardDescription>
                Entre com seu número de identificação de participante
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/participant/login">
                <Button className="w-full" size="lg">
                  Entrar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-12">Funcionalidades</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📱</span>
              </div>
              <h4 className="font-semibold mb-2">Requer Conexão à Internet</h4>
              <p className="text-sm text-muted-foreground">
                Acesse pelo celular ou computador com Wi-Fi ou dados móveis ativos
              </p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎧</span>
              </div>
              <h4 className="font-semibold mb-2">Áudios Controlados</h4>
              <p className="text-sm text-muted-foreground">
                Tracking preciso de progresso de escuta dos áudios
              </p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h4 className="font-semibold mb-2">Relatórios Completos</h4>
              <p className="text-sm text-muted-foreground">
                Exportação de dados para análise estatística
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 {appTitle}. Sistema de pesquisa científica.</p>
        </div>
      </footer>
    </div>
  );
}
