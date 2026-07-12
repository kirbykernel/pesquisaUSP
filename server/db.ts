import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  participants, 
  InsertParticipant,
  content,
  InsertContent,
  dailyResponses,
  InsertDailyResponse,
  audioProgress,
  InsertAudioProgress,
  appSettings,
  InsertAppSetting,
  adminInvites,
  InsertAdminInvite,
  timerProgress,
  InsertTimerProgress
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============= PARTICIPANTS =============

export async function createParticipant(data: InsertParticipant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(participants).values(data);
  return result;
}

export async function getParticipantByNumber(participantNumber: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(participants)
    .where(eq(participants.participantNumber, participantNumber))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getAllParticipants() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(participants).orderBy(desc(participants.createdAt));
}

export async function getParticipantsByGroup(group: "intervention" | "control") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(participants)
    .where(eq(participants.group, group))
    .orderBy(desc(participants.createdAt));
}

// ============= CONTENT =============

export async function createContent(data: InsertContent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(content).values(data);
  return result;
}

export async function getContentByType(type: "welcome_video" | "intervention_audio" | "control_info") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(content)
    .where(and(eq(content.type, type), eq(content.active, true)))
    .orderBy(desc(content.createdAt));
}

export async function getInterventionAudioByNumber(audioNumber: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(content)
    .where(
      and(
        eq(content.type, "intervention_audio"),
        eq(content.audioNumber, audioNumber),
        eq(content.active, true)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateContent(id: number, data: Partial<InsertContent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(content).set(data).where(eq(content.id, id));
}

// ============= DAILY RESPONSES =============

export async function createDailyResponse(data: InsertDailyResponse) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(dailyResponses).values(data);
  return result;
}

export async function getDailyResponsesByParticipant(participantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(dailyResponses)
    .where(eq(dailyResponses.participantId, participantId))
    .orderBy(desc(dailyResponses.responseDate));
}

export async function getDailyResponseByParticipantAndDay(participantId: number, dayNumber: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(dailyResponses)
    .where(
      and(
        eq(dailyResponses.participantId, participantId),
        eq(dailyResponses.dayNumber, dayNumber)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getAllDailyResponses() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(dailyResponses)
    .orderBy(desc(dailyResponses.responseDate));
}

// ============= AUDIO PROGRESS =============

export async function createAudioProgress(data: InsertAudioProgress) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(audioProgress).values(data);
  return result;
}

export async function updateAudioProgress(id: number, data: Partial<InsertAudioProgress>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(audioProgress).set(data).where(eq(audioProgress.id, id));
}

export async function getAudioProgressByParticipantAndDay(
  participantId: number, 
  audioNumber: number, 
  dayNumber: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(audioProgress)
    .where(
      and(
        eq(audioProgress.participantId, participantId),
        eq(audioProgress.audioNumber, audioNumber),
        eq(audioProgress.dayNumber, dayNumber)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getAudioProgressByParticipant(participantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(audioProgress)
    .where(eq(audioProgress.participantId, participantId))
    .orderBy(desc(audioProgress.accessDate));
}

export async function getAllAudioProgress() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(audioProgress)
    .orderBy(desc(audioProgress.accessDate));
}


// ============= TIMER PROGRESS (GRUPO CONTROLE) =============

export async function createTimerProgress(data: InsertTimerProgress) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(timerProgress).values(data);
}

export async function updateTimerProgress(id: number, data: Partial<InsertTimerProgress>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(timerProgress).set(data).where(eq(timerProgress.id, id));
}

export async function getTimerProgressByParticipantAndDay(participantId: number, dayNumber: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(timerProgress)
    .where(
      and(
        eq(timerProgress.participantId, participantId),
        eq(timerProgress.dayNumber, dayNumber)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getTimerProgressByParticipant(participantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(timerProgress)
    .where(eq(timerProgress.participantId, participantId))
    .orderBy(desc(timerProgress.accessDate));
}

// ============= APP SETTINGS =============
export async function getAppSetting(key: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function setAppSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getAppSetting(key);
  
  if (existing) {
    await db
      .update(appSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(appSettings.key, key));
  } else {
    await db.insert(appSettings).values({ key, value });
  }
}

export async function getAllAppSettings() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(appSettings);
}

// ============= ADMIN INVITES =============

export async function createAdminInvite(data: InsertAdminInvite) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(adminInvites).values(data);
}

export async function getAdminInviteByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(adminInvites).where(eq(adminInvites.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function acceptAdminInvite(email: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(adminInvites)
    .set({ accepted: true, acceptedAt: new Date() })
    .where(eq(adminInvites.email, email));
}

export async function deleteAdminInvite(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(adminInvites).where(eq(adminInvites.id, id));
}

export async function getAllAdminInvites() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(adminInvites).orderBy(adminInvites.createdAt);
}
