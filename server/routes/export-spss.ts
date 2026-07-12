import express from "express";
import { sdk } from "../_core/sdk";
import * as db from "../db";

const router = express.Router();

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
        participant_id: r.participantId,
        participant_number: participant?.participantNumber ?? "",
        group: participant?.group === "intervention" ? 1 : 2,
        start_date: participant?.startDate
          ? new Date(participant.startDate).toISOString().split("T")[0]
          : "",
        day_number: r.dayNumber,
        wellbeing_before: r.wellbeingBefore ?? null,
        wellbeing_after: r.wellbeingAfter ?? null,
        pause_duration_min: r.pauseDuration != null
          ? Math.round(r.pauseDuration / 60)
          : null,
        current_activity: r.currentActivity ?? "",
        response_date: r.responseDate
          ? new Date(r.responseDate).toISOString().split("T")[0]
          : "",
        audio_number: audio?.audioNumber ?? null,
        audio_pct_listened: audio?.percentageListened ?? null,
        audio_completed: audio != null ? (audio.completed ? 1 : 0) : null,
        audio_access_date: audio?.accessDate
          ? new Date(audio.accessDate).toISOString().split("T")[0]
          : "",
      };
    });

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
        name: "participant_id",
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
        label: "Data de Inicio (AAAA-MM-DD)",
      },
      {
        name: "day_number",
        type: 0,
        label: "Dia do Protocolo (1-28)",
        printFormat: "F2.0",
      },
      {
        name: "wellbeing_before",
        type: 0,
        label: "Bem-Estar ANTES da Pausa (1-5)",
        printFormat: "F1.0",
        values: wellbeingValues,
      },
      {
        name: "wellbeing_after",
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

    const filename = `pesquisa_pausa_${filenameSuffix}_${new Date().toISOString().split("T")[0]}.sav`;

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
        participant_id: r.participantId,
        participant_number: participant?.participantNumber ?? "",
        group: participant?.group === "intervention" ? 1 : 2,
        start_date: participant?.startDate
          ? new Date(participant.startDate).toISOString().split("T")[0]
          : "",
        day_number: r.dayNumber,
        wellbeing_before: r.wellbeingBefore ?? null,
        wellbeing_after: r.wellbeingAfter ?? null,
        pause_duration_min: r.pauseDuration != null
          ? Math.round(r.pauseDuration / 60)
          : null,
        current_activity: r.currentActivity ?? "",
        response_date: r.responseDate
          ? new Date(r.responseDate).toISOString().split("T")[0]
          : "",
        audio_number: audio?.audioNumber ?? null,
        audio_pct_listened: audio?.percentageListened ?? null,
        audio_completed: audio != null ? (audio.completed ? 1 : 0) : null,
        audio_access_date: audio?.accessDate
          ? new Date(audio.accessDate).toISOString().split("T")[0]
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
      { name: "participant_id", type: 0, label: "ID do Participante", printFormat: "F8.0" },
      { name: "participant_number", type: 20, label: "Numero do Participante" },
      // Include group column when mixed groups are present
      ...(isMixed ? [{
        name: "group",
        type: 0,
        label: "Grupo",
        printFormat: "F1.0",
        values: { "1": "Intervencao", "2": "Controle" },
      } as SavVariable] : []),
      { name: "start_date", type: 10, label: "Data de Inicio (AAAA-MM-DD)" },
      { name: "day_number", type: 0, label: "Dia do Protocolo (1-28)", printFormat: "F2.0" },
      { name: "wellbeing_before", type: 0, label: "Bem-Estar ANTES da Pausa (1-5)", printFormat: "F1.0", values: wellbeingValues },
      { name: "wellbeing_after", type: 0, label: "Bem-Estar DEPOIS da Pausa (1-5)", printFormat: "F1.0", values: wellbeingValues },
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

    const filename = `pesquisa_pausa_filtrado_${new Date().toISOString().split("T")[0]}.sav`;
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

