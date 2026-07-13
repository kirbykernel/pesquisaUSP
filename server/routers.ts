import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { TRPCError } from "@trpc/server";

// Helper para gerar número único de participante
function generateParticipantNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `P${timestamp}${random}`;
}

// Data de calendário no fuso dos participantes (pesquisa conduzida no Brasil)
function getDateInSaoPaulo(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============= PARTICIPANTS =============
  participants: router({
    // Criar participantes no grupo escolhido pelo admin
    create: protectedProcedure
      .input(z.object({
        count: z.number().min(1).max(100).optional().default(1),
        group: z.enum(["intervention", "control"]),
      }))
      .mutation(async ({ input }) => {
        const created = [];
        for (let i = 0; i < input.count; i++) {
          let participantNumber = generateParticipantNumber();

          // Garantir que o número é único
          let existing = await db.getParticipantByNumber(participantNumber);
          while (existing) {
            participantNumber = generateParticipantNumber();
            existing = await db.getParticipantByNumber(participantNumber);
          }

          await db.createParticipant({
            participantNumber,
            group: input.group,
            startDate: new Date(), // Data de início é hoje
            active: true,
          });

          created.push({ participantNumber, group: input.group });
        }

        return { success: true, participants: created };
      }),

    // Listar todos os participantes
    list: protectedProcedure.query(async () => {
      return await db.getAllParticipants();
    }),

    // Buscar participante por número (para login)
    getByNumber: publicProcedure
      .input(z.object({
        participantNumber: z.string(),
      }))
      .query(async ({ input }) => {
        const participant = await db.getParticipantByNumber(input.participantNumber);
        if (!participant) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Participante não encontrado",
          });
        }
        return participant;
      }),

    // Estatísticas
    stats: protectedProcedure.query(async () => {
      const all = await db.getAllParticipants();
      const intervention = all.filter(p => p.group === "intervention");
      const control = all.filter(p => p.group === "control");
      const active = all.filter(p => p.active);

      return {
        total: all.length,
        intervention: intervention.length,
        control: control.length,
        active: active.length,
        inactive: all.length - active.length,
      };
    }),
  }),

  // ============= CONTENT =============
  content: router({
    // Upload de vídeo de boas-vindas
    uploadWelcomeVideo: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileData: z.string(), // Base64
        mimeType: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.fileData, 'base64');
        const fileKey = `welcome-videos/${Date.now()}-${input.fileName}`;
        
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        // Desativar vídeos anteriores
        const existing = await db.getContentByType("welcome_video");
        for (const item of existing) {
          await db.updateContent(item.id, { active: false });
        }

        await db.createContent({
          type: "welcome_video",
          fileUrl: url,
          fileKey,
          title: input.title,
          description: input.description,
          active: true,
        });

        return { success: true, url };
      }),

    // Upload de áudio de intervenção
    uploadInterventionAudio: protectedProcedure
      .input(z.object({
        audioNumber: z.number().min(1).max(4),
        fileName: z.string(),
        fileData: z.string(), // Base64
        mimeType: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.fileData, 'base64');
        const fileKey = `intervention-audios/audio-${input.audioNumber}-${Date.now()}-${input.fileName}`;
        
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        // Desativar áudios anteriores com o mesmo número
        const existing = await db.getInterventionAudioByNumber(input.audioNumber);
        if (existing) {
          await db.updateContent(existing.id, { active: false });
        }

        await db.createContent({
          type: "intervention_audio",
          fileUrl: url,
          fileKey,
          audioNumber: input.audioNumber,
          title: input.title,
          description: input.description,
          active: true,
        });

        return { success: true, url };
      }),

    // Upload de informações do grupo controle
    uploadControlInfo: protectedProcedure
      .input(z.object({
        content: z.string(),
        title: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getContentByType("control_info");
        
        if (existing.length > 0) {
          // Atualizar a primeira entrada existente
          await db.updateContent(existing[0].id, {
            fileUrl: input.content,
            title: input.title,
            active: true,
          });
          
          // Desativar outras entradas duplicadas se existirem
          for (let i = 1; i < existing.length; i++) {
            await db.updateContent(existing[i].id, { active: false });
          }
        } else {
          // Criar nova entrada se não existir
          await db.createContent({
            type: "control_info",
            fileUrl: input.content,
            title: input.title,
            active: true,
          });
        }

        return { success: true };
      }),

    // Buscar vídeo de boas-vindas ativo
    getWelcomeVideo: publicProcedure.query(async () => {
      const videos = await db.getContentByType("welcome_video");
      return videos.length > 0 ? videos[0] : null;
    }),

    // Buscar áudio de intervenção por número
    getInterventionAudio: publicProcedure
      .input(z.object({
        audioNumber: z.number().min(1).max(4),
      }))
      .query(async ({ input }) => {
        return await db.getInterventionAudioByNumber(input.audioNumber);
      }),

    // Buscar todos os áudios de intervenção
    getInterventionAudios: publicProcedure.query(async () => {
      return await db.getContentByType("intervention_audio");
    }),

    // Buscar informações do grupo controle
    getControlInfo: publicProcedure.query(async () => {
      const info = await db.getContentByType("control_info");
      return info.length > 0 ? info[0] : null;
    }),
  }),

  // ============= DAILY RESPONSES =============
  responses: router({
    // Buscar respostas por participante
    getByParticipant: publicProcedure
      .input(z.object({ participantId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDailyResponsesByParticipant(input.participantId);
      }),

    // Criar resposta diária — modelo de fases: o dia é calculado no servidor
    // a partir das práticas já completadas, nunca informado pelo cliente
    create: publicProcedure
      .input(z.object({
        participantId: z.number(),
        wellbeingBefore: z.number().min(1).max(5),
        wellbeingAfter: z.number().min(1).max(5),
        pauseDuration: z.number().optional().nullable(),
        currentActivity: z.string(),
        responseDate: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getDailyResponsesByParticipant(input.participantId);

        // Ciclo completo: 28 práticas realizadas
        if (existing.length >= 28) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Você já completou os 28 dias da pesquisa. Obrigado pela participação!",
          });
        }

        // Apenas uma prática por dia de calendário
        const today = getDateInSaoPaulo(new Date());
        const respondedToday = existing.some(
          r => getDateInSaoPaulo(new Date(r.responseDate)) === today
        );
        if (respondedToday) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Você já respondeu hoje. Volte amanhã!",
          });
        }

        // Próximo dia = práticas completadas + 1 (avança apenas ao completar)
        const dayNumber = existing.length + 1;

        await db.createDailyResponse({
          participantId: input.participantId,
          dayNumber,
          wellbeingBefore: input.wellbeingBefore,
          wellbeingAfter: input.wellbeingAfter,
          pauseDuration: input.pauseDuration,
          currentActivity: input.currentActivity,
          responseDate: input.responseDate || new Date(),
          synced: true,
        });

        return { success: true, dayNumber };
      }),

    // Buscar todas as respostas (para relatórios)
    getAll: protectedProcedure.query(async () => {
      return await db.getAllDailyResponses();
    }),
  }),

  // ============= AUDIO PROGRESS =============
  audioProgress: router({
    // Salvar/atualizar progresso de áudio
    save: publicProcedure
      .input(z.object({
        participantId: z.number(),
        audioNumber: z.number().min(1).max(4),
        dayNumber: z.number().min(1).max(28),
        percentageListened: z.number().min(0).max(100),
        lastPosition: z.number().min(0),
        completed: z.boolean(),
        accessDate: z.date(),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getAudioProgressByParticipantAndDay(
          input.participantId,
          input.audioNumber,
          input.dayNumber
        );

        if (existing) {
          const sameDay =
            getDateInSaoPaulo(new Date(existing.accessDate)) === getDateInSaoPaulo(input.accessDate);
          if (!sameDay) {
            // Sessão em outro dia de calendário (prática anterior não enviada):
            // a fase recomeça, então o registro é sobrescrito em vez de comparado
            await db.updateAudioProgress(existing.id, {
              percentageListened: input.percentageListened,
              lastPosition: input.lastPosition,
              completed: input.completed,
              accessDate: input.accessDate,
              synced: true,
            });
          } else if (input.percentageListened > existing.percentageListened) {
            // Mesmo dia: manter apenas o maior percentual atingido
            await db.updateAudioProgress(existing.id, {
              percentageListened: input.percentageListened,
              lastPosition: input.lastPosition,
              completed: input.completed,
              accessDate: input.accessDate,
              synced: true,
            });
          }
        } else {
          await db.createAudioProgress({
            participantId: input.participantId,
            audioNumber: input.audioNumber,
            dayNumber: input.dayNumber,
            percentageListened: input.percentageListened,
            lastPosition: input.lastPosition,
            completed: input.completed,
            accessDate: input.accessDate,
            synced: true,
          });
        }

        return { success: true };
      }),

    // Buscar progresso por participante
    getByParticipant: publicProcedure
      .input(z.object({
        participantId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getAudioProgressByParticipant(input.participantId);
      }),

    // Buscar todo o progresso (para relatórios)
    getAll: protectedProcedure.query(async () => {
      return await db.getAllAudioProgress();
    }),
   }),

  // ============= TIMER PROGRESS (GRUPO CONTROLE) =============
  timerProgress: router({
    // Salvar/atualizar progresso do cronômetro — mesma semântica do audioProgress:
    // sessão em outro dia de calendário recomeça; no mesmo dia vale o maior valor
    save: publicProcedure
      .input(z.object({
        participantId: z.number(),
        dayNumber: z.number().min(1).max(28),
        secondsElapsed: z.number().min(0),
        accessDate: z.date(),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getTimerProgressByParticipantAndDay(
          input.participantId,
          input.dayNumber
        );

        if (existing) {
          const sameDay =
            getDateInSaoPaulo(new Date(existing.accessDate)) === getDateInSaoPaulo(input.accessDate);
          if (!sameDay || input.secondsElapsed > existing.secondsElapsed) {
            await db.updateTimerProgress(existing.id, {
              secondsElapsed: input.secondsElapsed,
              accessDate: input.accessDate,
            });
          }
        } else {
          await db.createTimerProgress({
            participantId: input.participantId,
            dayNumber: input.dayNumber,
            secondsElapsed: input.secondsElapsed,
            accessDate: input.accessDate,
          });
        }

        return { success: true };
      }),

    // Buscar progresso por participante
    getByParticipant: publicProcedure
      .input(z.object({
        participantId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getTimerProgressByParticipant(input.participantId);
      }),
  }),

  // ============= SETTINGS =============
  settings: router({
    // Buscar configuração por chave
    get: publicProcedure
      .input(z.object({
        key: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getAppSetting(input.key);
      }),
    
    // Salvar configuração
    set: protectedProcedure
      .input(z.object({
        key: z.string(),
        value: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.setAppSetting(input.key, input.value);
        return { success: true };
      }),
    
    // Buscar todas as configurações
    getAll: protectedProcedure.query(async () => {
      return await db.getAllAppSettings();
    }),
    
    // Buscar configurações formatadas (para uso no frontend)
    getFormatted: publicProcedure.query(async () => {
      const settings = await db.getAllAppSettings();
      const formatted: any = {};
      
      settings.forEach(setting => {
        if (setting.key === 'accessTimeEnabled') {
          formatted[setting.key] = setting.value === 'true';
        } else if (setting.key === 'accessStartHour' || setting.key === 'accessEndHour') {
          formatted[setting.key] = parseInt(setting.value);
        } else {
          formatted[setting.key] = setting.value;
        }
      });
      
      return formatted;
    }),
  }),

  // ============= ADMIN INVITES =============
  adminInvites: router({
    // Listar todos os convites (apenas admin)
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      return await db.getAllAdminInvites();
    }),

    // Convidar um email para ser admin
    invite: protectedProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        // Check if already invited
        const existing = await db.getAdminInviteByEmail(input.email);
        if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Este email já foi convidado.' });
        await db.createAdminInvite({
          email: input.email,
          invitedByOpenId: ctx.user.openId,
          invitedByName: ctx.user.name ?? null,
        });
        return { success: true };
      }),

    // Revogar convite ou remover admin
    revoke: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        await db.deleteAdminInvite(input.id);
        return { success: true };
      }),

    // Listar todos os usuários com role=admin
    listAdmins: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const { eq } = await import('drizzle-orm');
      const { users } = await import('../drizzle/schema');
      return await dbConn.select().from(users).where(eq(users.role, 'admin'));
    }),
  }),
});
export type AppRouter = typeof appRouter;
