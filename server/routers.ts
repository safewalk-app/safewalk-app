import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "../shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // SafeWalk routers
  safewalk: router({
    // Sessions
    sessions: router({
      create: protectedProcedure
        .input(z.object({
          id: z.string(),
          limitTime: z.number(),
          deadline: z.number(),
          note: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const session = await db.upsertSession({
            id: input.id,
            userId: ctx.user.id,
            limitTime: new Date(input.limitTime),
            deadline: new Date(input.deadline),
            note: input.note,
          });
          return session;
        }),
      
      get: protectedProcedure
        .input(z.object({ sessionId: z.string() }))
        .query(async ({ input }) => {
          return db.getSession(input.sessionId);
        }),
      
      list: protectedProcedure
        .query(async ({ ctx }) => {
          return db.getUserSessions(ctx.user.id, 50);
        }),
      
      update: protectedProcedure
        .input(z.object({
          id: z.string(),
          status: z.enum(['active', 'grace', 'overdue', 'returned', 'cancelled']).optional(),
          checkInConfirmed: z.boolean().optional(),
          endTime: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const session = await db.getSession(input.id);
          if (!session) return null;
          
          const updates: any = { ...session };
          if (input.status) updates.status = input.status;
          if (input.checkInConfirmed !== undefined) {
            updates.checkInConfirmed = input.checkInConfirmed ? 1 : 0;
            if (input.checkInConfirmed) updates.checkInConfirmedAt = new Date();
          }
          if (input.endTime) updates.endTime = new Date(input.endTime);
          updates.updatedAt = new Date();
          
          return db.upsertSession(updates);
        }),
    }),
    
    // Positions
    positions: router({
      save: protectedProcedure
        .input(z.object({
          id: z.string(),
          sessionId: z.string(),
          latitude: z.string(),
          longitude: z.string(),
          accuracy: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          return db.savePosition({
            id: input.id,
            sessionId: input.sessionId,
            latitude: input.latitude,
            longitude: input.longitude,
            accuracy: input.accuracy,
          });
        }),
      
      list: protectedProcedure
        .input(z.object({ sessionId: z.string() }))
        .query(async ({ input }) => {
          return db.getSessionPositions(input.sessionId);
        }),
    }),
    
    // SMS Logs
    smsLogs: router({
      save: protectedProcedure
        .input(z.object({
          id: z.string(),
          sessionId: z.string(),
          phoneNumber: z.string(),
          message: z.string(),
        }))
        .mutation(async ({ input }) => {
          return db.saveSmsLog({
            id: input.id,
            sessionId: input.sessionId,
            phoneNumber: input.phoneNumber,
            message: input.message,
          });
        }),
      
      updateStatus: protectedProcedure
        .input(z.object({
          smsId: z.string(),
          status: z.enum(['pending', 'sent', 'delivered', 'failed']),
          sentAt: z.string().optional(),
          deliveredAt: z.string().optional(),
          failureReason: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          return db.updateSmsStatus(input.smsId, input.status, {
            sentAt: input.sentAt ? new Date(input.sentAt) : undefined,
            deliveredAt: input.deliveredAt ? new Date(input.deliveredAt) : undefined,
            failureReason: input.failureReason,
          });
        }),
      
      list: protectedProcedure
        .input(z.object({ sessionId: z.string() }))
        .query(async ({ input }) => {
          return db.getSessionSmsLogs(input.sessionId);
        }),
    }),
    
    // User Preferences
    preferences: router({
      get: protectedProcedure
        .query(async ({ ctx }) => {
          return db.getUserPreferences(ctx.user.id);
        }),
      
      update: protectedProcedure
        .input(z.object({
          firstName: z.string().optional(),
          emergencyContact1Name: z.string().optional(),
          emergencyContact1Phone: z.string().optional(),
          emergencyContact2Name: z.string().optional(),
          emergencyContact2Phone: z.string().optional(),
          tolerance: z.number().optional(),
          locationEnabled: z.boolean().optional(),
          notificationsEnabled: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          return db.upsertUserPreferences({
            userId: ctx.user.id,
            firstName: input.firstName,
            emergencyContact1Name: input.emergencyContact1Name,
            emergencyContact1Phone: input.emergencyContact1Phone,
            emergencyContact2Name: input.emergencyContact2Name,
            emergencyContact2Phone: input.emergencyContact2Phone,
            locationEnabled: input.locationEnabled ? 1 : 0,
            notificationsEnabled: input.notificationsEnabled ? 1 : 0,
          });
        }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
