import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Configurações do aplicativo
 */
export const appSettings = mysqlTable("appSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(), // Chave da configuração
  value: text("value").notNull(), // Valor da configuração (JSON string)
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = typeof appSettings.$inferInsert;

/**
 * Participantes da pesquisa
 */
export const participants = mysqlTable("participants", {
  id: int("id").autoincrement().primaryKey(),
  participantNumber: varchar("participantNumber", { length: 20 }).notNull().unique(), // Número único de identificação
  group: mysqlEnum("group", ["intervention", "control"]).notNull(), // Grupo: intervenção ou controle
  startDate: timestamp("startDate"), // Data de criação do registro (mantido como histórico)
  firstLoginAt: timestamp("firstLoginAt"), // Primeiro login — âncora do dia 1 do protocolo (28 dias corridos)
  randomizedAt: timestamp("randomizedAt").defaultNow().notNull(), // Data da randomização
  active: boolean("active").default(true).notNull(), // Participante ativo ou não
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = typeof participants.$inferInsert;

/**
 * Conteúdo do aplicativo (vídeos, áudios, informações)
 */
export const content = mysqlTable("content", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["welcome_video", "intervention_audio", "control_info"]).notNull(),
  fileUrl: text("fileUrl"), // URL do arquivo no S3
  fileKey: text("fileKey"), // Chave do arquivo no S3
  audioNumber: int("audioNumber"), // Número do áudio (1-4) para grupo intervenção
  title: varchar("title", { length: 255 }),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Content = typeof content.$inferSelect;
export type InsertContent = typeof content.$inferInsert;

/**
 * Respostas diárias dos participantes
 */
export const dailyResponses = mysqlTable("dailyResponses", {
  id: int("id").autoincrement().primaryKey(),
  participantId: int("participantId").notNull(), // FK para participants
  dayNumber: int("dayNumber").notNull(), // Dia da pesquisa (1-28)
  wellbeingBefore: int("wellbeingBefore").notNull(), // Bem-estar ANTES da pausa (1-5)
  wellbeingAfter: int("wellbeingAfter"), // Bem-estar DEPOIS da pausa (1-5)
  pauseDuration: int("pauseDuration"), // Duração da pausa em segundos (grupo controle)
  currentActivity: text("currentActivity"), // O que está fazendo no momento
  responseDate: timestamp("responseDate").notNull(), // Data/hora da resposta
  synced: boolean("synced").default(false).notNull(), // Se foi sincronizado do offline
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DailyResponse = typeof dailyResponses.$inferSelect;
export type InsertDailyResponse = typeof dailyResponses.$inferInsert;

/**
 * Progresso de áudios (apenas grupo intervenção)
 */
export const audioProgress = mysqlTable("audioProgress", {
  id: int("id").autoincrement().primaryKey(),
  participantId: int("participantId").notNull(), // FK para participants
  audioNumber: int("audioNumber").notNull(), // Número do áudio (1-4)
  dayNumber: int("dayNumber").notNull(), // Dia da pesquisa (1-28)
  percentageListened: int("percentageListened").notNull().default(0), // Percentual escutado (0-100)
  completed: boolean("completed").default(false).notNull(), // Se escutou 100%
  lastPosition: int("lastPosition").default(0).notNull(), // Última posição em segundos
  accessDate: timestamp("accessDate").notNull(), // Data/hora do acesso
  synced: boolean("synced").default(false).notNull(), // Se foi sincronizado do offline
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AudioProgress = typeof audioProgress.$inferSelect;
export type InsertAudioProgress = typeof audioProgress.$inferInsert;

/**
 * Progresso do cronômetro de pausa (apenas grupo controle)
 * Espelha o audioProgress do grupo intervenção: sobrevive a recarregamentos
 * e vale apenas para o dia de calendário em que foi registrado
 */
export const timerProgress = mysqlTable("timerProgress", {
  id: int("id").autoincrement().primaryKey(),
  participantId: int("participantId").notNull(), // FK para participants
  dayNumber: int("dayNumber").notNull(), // Dia da pesquisa (1-28)
  secondsElapsed: int("secondsElapsed").notNull().default(0), // Segundos de pausa acumulados
  accessDate: timestamp("accessDate").notNull(), // Data/hora do registro
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TimerProgress = typeof timerProgress.$inferSelect;
export type InsertTimerProgress = typeof timerProgress.$inferInsert;

/**
 * Convites de administradores
 * Quando um email está nesta tabela e a pessoa faz login, ela recebe role=admin automaticamente
 */
export const adminInvites = mysqlTable("adminInvites", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  invitedByOpenId: varchar("invitedByOpenId", { length: 64 }).notNull(),
  invitedByName: text("invitedByName"),
  accepted: boolean("accepted").default(false).notNull(), // true quando a pessoa fez login pela primeira vez
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminInvite = typeof adminInvites.$inferSelect;
export type InsertAdminInvite = typeof adminInvites.$inferInsert;
