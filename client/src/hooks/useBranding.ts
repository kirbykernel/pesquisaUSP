import { trpc } from "@/lib/trpc";
import { APP_LOGO, APP_TITLE } from "@/const";

export function useBranding() {
  const { data: appTitleSettings, isLoading: loadingTitle } = trpc.settings.get.useQuery({ key: "app_title" });
  const { data: loginTitleSettings } = trpc.settings.get.useQuery({ key: "login_title" });
  const { data: researcher1Settings } = trpc.settings.get.useQuery({ key: "researcher_line1" });
  const { data: researcher2Settings } = trpc.settings.get.useQuery({ key: "researcher_line2" });
  const { data: logoSettings, isLoading: loadingLogo } = trpc.settings.get.useQuery({ key: "custom_logo_url" });

  // Enquanto a query ainda está carregando, retornar null para evitar flash do logo antigo.
  // Quando carregada: usar o valor do banco se existir, senão usar VITE_APP_LOGO (env correto).
  // Nunca usar o arquivo estático /pausa-logo.png como fallback pois é o logo antigo.
  const logoUrl = loadingLogo
    ? null
    : (logoSettings?.value || APP_LOGO || null);

  return {
    appTitle: appTitleSettings?.value || APP_TITLE,
    loginTitle: loginTitleSettings?.value || "Ensaio Clínico Randomizado - PAUSA",
    researcherLine1: researcher1Settings?.value || "Prof. PhD Dra. Maria do Patrocínio e Dra Nancy Huang",
    researcherLine2: researcher2Settings?.value || "Dr. João Paulo Costa Braga",
    logoUrl,
    isLoadingLogo: loadingLogo,
  };
}
