import express from "express";
import { sdk } from "../_core/sdk";
import * as db from "../db";

const router = express.Router();

// Data de calendário no fuso dos participantes (mesma regra de server/routers.ts)
function getDateInSaoPaulo(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

// Dia do protocolo = dias de calendário desde o primeiro login (mesma regra de server/routers.ts)
function getProtocolDay(firstLoginAt: Date, now: Date = new Date()): number {
  const first = Date.parse(getDateInSaoPaulo(firstLoginAt));
  const today = Date.parse(getDateInSaoPaulo(now));
  return Math.round((today - first) / 86_400_000) + 1;
}

type SavVariable = {
  name: string;
  type: number;
  label?: string;
  printFormat?: string;
  writeFormat?: string;
  values?: Record<string, string>;
};

/**
 * GET /api/export/spss[?group=intervention|control]
 * Exports research data as an SPSS .sav file.
 * - No ?group param  → all participants
 * - ?group=intervention → intervention group only
 * - ?group=control    → control group only
 * Requires admin authentication.
 */
router.get("/export/spss", async (req, res) => {
  try {
    // Admin auth check
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (user.role !== "admin") {
      res.status(403).json({ error: "Forbidden: admin only" });
      return;
    }

    // Parse optional group filter
    const groupParam = req.query.group as string | undefined;
    const groupFilter: "intervention" | "control" | null =
      groupParam === "intervention" ? "intervention"
      : groupParam === "control" ? "control"
      : null;

    // Fetch all data
    const allParticipants = await db.getAllParticipants();
    const allResponses = await db.getAllDailyResponses();
    const audioProgressAll = await db.getAllAudioProgress();

    // Apply group filter to participants
    const participants = groupFilter
      ? allParticipants.filter(p => p.group === groupFilter)
      : allParticipants;

    const participantIds = new Set(participants.map(p => p.id));

    // Filter responses to selected participants only
    const responses = allResponses.filter(r => participantIds.has(r.participantId));

    // Build lookup maps
    const participantMap = new Map(participants.map(p => [p.id, p]));

    // Build audio progress lookup: key = `${participantId}_${dayNumber}`
    const audioMap = new Map<string, typeof audioProgressAll[0]>();
    for (const ap of audioProgressAll) {
      if (!participantIds.has(ap.participantId)) continue;
      const key = `${ap.participantId}_${ap.dayNumber}`;
      const existing = audioMap.get(key);
      if (!existing || ap.percentageListened > existing.percentageListened) {
        audioMap.set(key, ap);
      }
    }

    // Build flat records for SPSS
    const records = responses.map(r => {
      const participant = participantMap.get(r.participantId);
      const audioKey = `${r.participantId}_${r.dayNumber}`;
      const audio = audioMap.get(audioKey);

      return {
        id_interno: r.participantId,
        participant_number: participant?.participantNumber ?? "",
        group: participant?.group === "intervention" ? 1 : 2,
        start_date: participant?.firstLoginAt
          ? getDateInSaoPaulo(new Date(participant.firstLoginAt))
          : "",
        day_number: r.dayNumber,
        wb_antes: r.wellbeingBefore ?? null,
        wb_depois: r.wellbeingAfter ?? null,
        pause_duration_min: r.pauseDuration != null
          ? Math.round(r.pauseDuration / 60)
          : null,
        current_activity: r.currentActivity ?? "",
        response_date: r.responseDate
          ? getDateInSaoPaulo(new Date(r.responseDate))
          : "",
        audio_number: audio?.audioNumber ?? null,
        audio_pct_listened: audio?.percentageListened ?? null,
        audio_completed: audio != null ? (audio.completed ? 1 : 0) : null,
        audio_access_date: audio?.accessDate
          ? getDateInSaoPaulo(new Date(audio.accessDate))
          : "",
      };
    });

    // Participantes sem nenhuma resposta também entram (uma linha em branco) —
    // o export não pode ocultar participantes por falta de respostas
    const respondedParticipantIds = new Set(responses.map(r => r.participantId));
    for (const p of participants) {
      if (respondedParticipantIds.has(p.id)) continue;
      records.push({
        id_interno: p.id,
        participant_number: p.participantNumber,
        group: p.group === "intervention" ? 1 : 2,
        start_date: p.firstLoginAt ? getDateInSaoPaulo(new Date(p.firstLoginAt)) : "",
        day_number: null,
        wb_antes: null,
        wb_depois: null,
        pause_duration_min: null,
        current_activity: "",
        response_date: "",
        audio_number: null,
        audio_pct_listened: null,
        audio_completed: null,
        audio_access_date: "",
      } as unknown as typeof records[0]);
    }

    // SPSS variable definitions
    const wellbeingValues: Record<string, string> = {
      "1": "Muito mal",
      "2": "Mal",
      "3": "Regular",
      "4": "Bem",
      "5": "Muito bem",
    };

    // For group-specific files, omit the group variable (it's constant)
    const sysvars: SavVariable[] = [
      {
        name: "id_interno",
        type: 0,
        label: "ID do Participante",
        printFormat: "F8.0",
      },
      {
        name: "participant_number",
        type: 20,
        label: "Numero do Participante",
      },
      // Include group column only in the combined (all) export
      ...(groupFilter === null ? [{
        name: "group",
        type: 0,
        label: "Grupo",
        printFormat: "F1.0",
        values: { "1": "Intervencao", "2": "Controle" },
      } as SavVariable] : []),
      {
        name: "start_date",
        type: 10,
        label: "Data de Inicio - Primeiro Login (AAAA-MM-DD)",
      },
      {
        name: "day_number",
        type: 0,
        label: "Dia do Protocolo (1-28)",
        printFormat: "F2.0",
      },
      {
        name: "wb_antes",
        type: 0,
        label: "Bem-Estar ANTES da Pausa (1-5)",
        printFormat: "F1.0",
        values: wellbeingValues,
      },
      {
        name: "wb_depois",
        type: 0,
        label: "Bem-Estar DEPOIS da Pausa (1-5)",
        printFormat: "F1.0",
        values: wellbeingValues,
      },
      {
        name: "pause_duration_min",
        type: 0,
        label: "Duracao da Pausa (minutos)",
        printFormat: "F4.1",
      },
      {
        name: "current_activity",
        type: 100,
        label: "Atividade Atual",
      },
      {
        name: "response_date",
        type: 10,
        label: "Data da Resposta (AAAA-MM-DD)",
      },
      // Audio columns only for intervention or combined export
      ...(groupFilter !== "control" ? [
        {
          name: "audio_number",
          type: 0,
          label: "Numero do Audio (Intervencao)",
          printFormat: "F1.0",
        } as SavVariable,
        {
          name: "audio_pct_listened",
          type: 0,
          label: "Percentual do Audio Escutado (%)",
          printFormat: "F5.1",
        } as SavVariable,
        {
          name: "audio_completed",
          type: 0,
          label: "Audio Completado",
          printFormat: "F1.0",
          values: { "0": "Nao", "1": "Sim" },
        } as SavVariable,
        {
          name: "audio_access_date",
          type: 10,
          label: "Data de Acesso ao Audio (AAAA-MM-DD)",
        } as SavVariable,
      ] : []),
    ];

    // Build file label and filename based on group filter
    const groupLabel =
      groupFilter === "intervention" ? "Grupo Intervencao"
      : groupFilter === "control" ? "Grupo Controle"
      : "Todos os Grupos";

    const filenameSuffix =
      groupFilter === "intervention" ? "intervencao"
      : groupFilter === "control" ? "controle"
      : "completo";

    const metadata = {
      encoding: "UTF-8",
      fileLabel: `Pesquisa PAUSA - ${groupLabel}`,
      sysvars,
    };

    // For control-only export, strip audio columns from records
    const finalRecords = groupFilter === "control"
      ? records.map(({ audio_number, audio_pct_listened, audio_completed, audio_access_date, ...rest }) => rest)
      : records;

    // Dynamic import because savfilewriter is ESM-only
    const { SavWriter } = await import("savfilewriter");

    const arrayBuffer = SavWriter.write(metadata, finalRecords);
    const buffer = Buffer.from(arrayBuffer);

    const filename = `pesquisa_pausa_${filenameSuffix}_${getDateInSaoPaulo(new Date())}.sav`;

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error("[SPSS Export] Error:", error);
    res.status(500).json({ error: "Failed to generate SPSS file", details: String(error) });
  }
});

/**
 * GET /api/export/spss-general[?group=intervention|control]
 * Export geral em formato longo: uma linha por participante × dia decorrido
 * (dia 1 até o dia atual, máx. 28). Inclui dias sem resposta e participantes
 * sem nenhuma resposta — nunca bloqueia por falta de dados.
 * Requires admin authentication.
 */
router.get("/export/spss-general", async (req, res) => {
  try {
    // Admin auth check
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (user.role !== "admin") {
      res.status(403).json({ error: "Forbidden: admin only" });
      return;
    }

    const groupParam = req.query.group as string | undefined;
    const groupFilter: "intervention" | "control" | null =
      groupParam === "intervention" ? "intervention"
      : groupParam === "control" ? "control"
      : null;

    const allParticipants = await db.getAllParticipants();
    const allResponses = await db.getAllDailyResponses();
    const audioProgressAll = await db.getAllAudioProgress();

    const participants = groupFilter
      ? allParticipants.filter(p => p.group === groupFilter)
      : allParticipants;

    // Respostas por participante, indexadas pelo dia
    const responsesByParticipant = new Map<number, Map<number, typeof allResponses[0]>>();
    for (const r of allResponses) {
      let byDay = responsesByParticipant.get(r.participantId);
      if (!byDay) {
        byDay = new Map();
        responsesByParticipant.set(r.participantId, byDay);
      }
      byDay.set(r.dayNumber, r);
    }

    // Progresso de áudio por participante+dia (maior percentual)
    const audioMap = new Map<string, typeof audioProgressAll[0]>();
    for (const ap of audioProgressAll) {
      const key = `${ap.participantId}_${ap.dayNumber}`;
      const existing = audioMap.get(key);
      if (!existing || ap.percentageListened > existing.percentageListened) {
        audioMap.set(key, ap);
      }
    }

    type GeneralRecord = Record<string, string | number | null>;
    const records: GeneralRecord[] = [];

    for (const p of participants) {
      const groupCode = p.group === "intervention" ? 1 : 2;

      if (!p.firstLoginAt) {
        // Participante que nunca acessou: uma linha única, sem dados de dia
        records.push({
          participant_number: p.participantNumber,
          group: groupCode,
          day_number: null,
          respondeu: null,
          audio_number: null,
          audio_pct: null,
          wb_antes: null,
          wb_depois: null,
          resposta_texto: "",
          response_date: "",
          dias_respondidos: 0,
          quais_dias: "",
        });
        continue;
      }

      const currentDay = getProtocolDay(new Date(p.firstLoginAt));
      const lastDay = Math.min(currentDay, 28);
      const byDay = responsesByParticipant.get(p.id) ?? new Map();
      const respondedDays = Array.from(byDay.keys()).sort((a, b) => a - b);

      for (let day = 1; day <= lastDay; day++) {
        const response = byDay.get(day);
        const audio = audioMap.get(`${p.id}_${day}`);

        records.push({
          participant_number: p.participantNumber,
          group: groupCode,
          day_number: day,
          respondeu: response ? 1 : 0,
          // Áudio só existe para o grupo intervenção (controle fica em branco)
          audio_number: p.group === "intervention" ? Math.ceil(day / 7) : null,
          audio_pct: p.group === "intervention" ? (audio?.percentageListened ?? null) : null,
          wb_antes: response?.wellbeingBefore ?? null,
          wb_depois: response?.wellbeingAfter ?? null,
          resposta_texto: response?.currentActivity ?? "",
          response_date: response ? getDateInSaoPaulo(new Date(response.responseDate)) : "",
          dias_respondidos: respondedDays.length,
          quais_dias: respondedDays.join(", "),
        });
      }
    }

    const wellbeingValues: Record<string, string> = {
      "1": "Muito mal",
      "2": "Mal",
      "3": "Regular",
      "4": "Bem",
      "5": "Muito bem",
    };

    // Atenção: os 8 primeiros caracteres de cada nome precisam ser únicos
    // (a lib savfilewriter trunca sem tratar colisões)
    const sysvars: SavVariable[] = [
      { name: "participant_number", type: 20, label: "Numero do Participante" },
      ...(groupFilter === null ? [{
        name: "group",
        type: 0,
        label: "Grupo",
        printFormat: "F1.0",
        values: { "1": "Intervencao", "2": "Controle" },
      } as SavVariable] : []),
      { name: "day_number", type: 0, label: "Dia do Protocolo (1-28)", printFormat: "F2.0" },
      { name: "respondeu", type: 0, label: "Respondeu neste Dia", printFormat: "F1.0", values: { "0": "Nao", "1": "Sim" } },
      { name: "audio_number", type: 0, label: "Numero do Audio do Dia (Intervencao)", printFormat: "F1.0" },
      { name: "audio_pct", type: 0, label: "Percentual do Audio Escutado (%)", printFormat: "F5.1" },
      { name: "wb_antes", type: 0, label: "Sentimento ANTES da Pausa (1-5)", printFormat: "F1.0", values: wellbeingValues },
      { name: "wb_depois", type: 0, label: "Sentimento DEPOIS da Pausa (1-5)", printFormat: "F1.0", values: wellbeingValues },
      { name: "resposta_texto", type: 100, label: "Resposta do Dia (Atividade)" },
      { name: "response_date", type: 10, label: "Data da Resposta (AAAA-MM-DD)" },
      { name: "dias_respondidos", type: 0, label: "Total de Dias Respondidos", printFormat: "F2.0" },
      { name: "quais_dias", type: 110, label: "Quais Dias Foram Respondidos" },
    ];

    const groupLabel =
      groupFilter === "intervention" ? "Grupo Intervencao"
      : groupFilter === "control" ? "Grupo Controle"
      : "Todos os Grupos";

    const filenameSuffix =
      groupFilter === "intervention" ? "geral_intervencao"
      : groupFilter === "control" ? "geral_controle"
      : "geral";

    const metadata = {
      encoding: "UTF-8",
      fileLabel: `Pesquisa PAUSA - Export Geral por Dia - ${groupLabel}`,
      sysvars,
    };

    const { SavWriter } = await import("savfilewriter");
    const arrayBuffer = SavWriter.write(metadata, records);
    const buffer = Buffer.from(arrayBuffer);

    const filename = `pesquisa_pausa_${filenameSuffix}_${getDateInSaoPaulo(new Date())}.sav`;
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error("[SPSS General Export] Error:", error);
    res.status(500).json({ error: "Failed to generate SPSS file", details: String(error) });
  }
});

/**
 * POST /api/export/spss-filtered
 * Body: { responseIds: number[], label?: string }
 * Exports only the specified response IDs as a .sav file.
 * Requires admin authentication.
 */
router.post("/export/spss-filtered", async (req, res) => {
  try {
    // Admin auth check
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (user.role !== "admin") {
      res.status(403).json({ error: "Forbidden: admin only" });
      return;
    }

    const { responseIds, label } = req.body as { responseIds: number[]; label?: string };
    if (!Array.isArray(responseIds) || responseIds.length === 0) {
      res.status(400).json({ error: "responseIds must be a non-empty array" });
      return;
    }

    // Fetch all data
    const allParticipants = await db.getAllParticipants();
    const allResponses = await db.getAllDailyResponses();
    const audioProgressAll = await db.getAllAudioProgress();

    // Filter to requested IDs
    const idSet = new Set(responseIds);
    const responses = allResponses.filter(r => idSet.has(r.id));

    if (responses.length === 0) {
      res.status(404).json({ error: "No matching responses found" });
      return;
    }

    const participantMap = new Map(allParticipants.map(p => [p.id, p]));

    // Determine which groups are present
    const groupsPresent = new Set(responses.map(r => participantMap.get(r.participantId)?.group));
    const hasIntervention = groupsPresent.has("intervention");
    const hasControl = groupsPresent.has("control");
    const isMixed = hasIntervention && hasControl;
    const isInterventionOnly = hasIntervention && !hasControl;

    // Audio progress lookup
    const audioMap = new Map<string, typeof audioProgressAll[0]>();
    for (const ap of audioProgressAll) {
      const key = `${ap.participantId}_${ap.dayNumber}`;
      const existing = audioMap.get(key);
      if (!existing || ap.percentageListened > existing.percentageListened) {
        audioMap.set(key, ap);
      }
    }

    // Build flat records
    const records = responses.map(r => {
      const participant = participantMap.get(r.participantId);
      const audioKey = `${r.participantId}_${r.dayNumber}`;
      const audio = audioMap.get(audioKey);

      return {
        id_interno: r.participantId,
        participant_number: participant?.participantNumber ?? "",
        group: participant?.group === "intervention" ? 1 : 2,
        start_date: participant?.firstLoginAt
          ? getDateInSaoPaulo(new Date(participant.firstLoginAt))
          : "",
        day_number: r.dayNumber,
        wb_antes: r.wellbeingBefore ?? null,
        wb_depois: r.wellbeingAfter ?? null,
        pause_duration_min: r.pauseDuration != null
          ? Math.round(r.pauseDuration / 60)
          : null,
        current_activity: r.currentActivity ?? "",
        response_date: r.responseDate
          ? getDateInSaoPaulo(new Date(r.responseDate))
          : "",
        audio_number: audio?.audioNumber ?? null,
        audio_pct_listened: audio?.percentageListened ?? null,
        audio_completed: audio != null ? (audio.completed ? 1 : 0) : null,
        audio_access_date: audio?.accessDate
          ? getDateInSaoPaulo(new Date(audio.accessDate))
          : "",
      };
    });

    const wellbeingValues: Record<string, string> = {
      "1": "Muito mal",
      "2": "Mal",
      "3": "Regular",
      "4": "Bem",
      "5": "Muito bem",
    };

    const sysvars: SavVariable[] = [
      { name: "id_interno", type: 0, label: "ID do Participante", printFormat: "F8.0" },
      { name: "participant_number", type: 20, label: "Numero do Participante" },
      // Include group column when mixed groups are present
      ...(isMixed ? [{
        name: "group",
        type: 0,
        label: "Grupo",
        printFormat: "F1.0",
        values: { "1": "Intervencao", "2": "Controle" },
      } as SavVariable] : []),
      { name: "start_date", type: 10, label: "Data de Inicio - Primeiro Login (AAAA-MM-DD)" },
      { name: "day_number", type: 0, label: "Dia do Protocolo (1-28)", printFormat: "F2.0" },
      { name: "wb_antes", type: 0, label: "Bem-Estar ANTES da Pausa (1-5)", printFormat: "F1.0", values: wellbeingValues },
      { name: "wb_depois", type: 0, label: "Bem-Estar DEPOIS da Pausa (1-5)", printFormat: "F1.0", values: wellbeingValues },
      { name: "pause_duration_min", type: 0, label: "Duracao da Pausa (minutos)", printFormat: "F4.1" },
      { name: "current_activity", type: 100, label: "Atividade Atual" },
      { name: "response_date", type: 10, label: "Data da Resposta (AAAA-MM-DD)" },
      // Audio columns only when intervention records are present
      ...(isInterventionOnly || isMixed ? [
        { name: "audio_number", type: 0, label: "Numero do Audio (Intervencao)", printFormat: "F1.0" } as SavVariable,
        { name: "audio_pct_listened", type: 0, label: "Percentual do Audio Escutado (%)", printFormat: "F5.1" } as SavVariable,
        { name: "audio_completed", type: 0, label: "Audio Completado", printFormat: "F1.0", values: { "0": "Nao", "1": "Sim" } } as SavVariable,
        { name: "audio_access_date", type: 10, label: "Data de Acesso ao Audio (AAAA-MM-DD)" } as SavVariable,
      ] : []),
    ];

    // Strip audio columns from records if control-only
    const finalRecords = (!isInterventionOnly && !isMixed)
      ? records.map(({ audio_number, audio_pct_listened, audio_completed, audio_access_date, ...rest }) => rest)
      : records;

    const fileLabel = label || `Pesquisa PAUSA - Filtrado (${responses.length} registros)`;
    const metadata = { encoding: "UTF-8", fileLabel, sysvars };

    const { SavWriter } = await import("savfilewriter");
    const arrayBuffer = SavWriter.write(metadata, finalRecords);
    const buffer = Buffer.from(arrayBuffer);

    const filename = `pesquisa_pausa_filtrado_${getDateInSaoPaulo(new Date())}.sav`;
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error("[SPSS Filtered Export] Error:", error);
    res.status(500).json({ error: "Failed to generate SPSS file", details: String(error) });
  }
});

export default router;

