import { TRPCError } from "@trpc/server";
import z from "zod";
import { PAGINATION } from "@/config/constants";
import type { NodeType } from "@/generated/prisma";
import { EXECUTION_METADATA_KEY } from "@/inngest/execution-plan";
import { sendWorkflowExecution } from "@/inngest/utils";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const executionsRouter = createTRPCRouter({
  retry: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const execution = await prisma.execution.findUniqueOrThrow({
        where: { id: input.id, workflow: { userId: ctx.auth.user.id } },
        select: { workflowId: true, initialData: true },
      });

      try {
        const runtimeMetadata =
          execution.initialData &&
          typeof execution.initialData === "object" &&
          !Array.isArray(execution.initialData)
            ? (execution.initialData as Record<string, unknown>)[
                EXECUTION_METADATA_KEY
              ]
            : undefined;
        const triggerNodeId =
          runtimeMetadata &&
          typeof runtimeMetadata === "object" &&
          runtimeMetadata !== null &&
          "triggerNodeId" in runtimeMetadata &&
          typeof runtimeMetadata.triggerNodeId === "string"
            ? runtimeMetadata.triggerNodeId
            : undefined;
        const triggerType =
          runtimeMetadata &&
          typeof runtimeMetadata === "object" &&
          runtimeMetadata !== null &&
          "triggerType" in runtimeMetadata &&
          typeof runtimeMetadata.triggerType === "string"
            ? (runtimeMetadata.triggerType as NodeType)
            : undefined;

        await sendWorkflowExecution({
          workflowId: execution.workflowId,
          triggerNodeId,
          triggerType,
          initialData:
            (execution.initialData as Record<string, unknown>) ?? undefined,
        });
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            err instanceof Error ? err.message : "Failed to retry execution",
        });
      }
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return prisma.execution.findUniqueOrThrow({
        where: {
          id: input.id,
          workflow: {
            userId: ctx.auth.user.id,
          },
        },
        include: {
          nodeExecutions: {
            orderBy: {
              orderIndex: "asc",
            },
          },
          workflow: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }),
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize } = input;

      const [items, totalCount] = await Promise.all([
        prisma.execution.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: {
            workflow: {
              userId: ctx.auth.user.id,
            },
          },
          orderBy: {
            startedAt: "desc",
          },
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.execution.count({
          where: {
            workflow: {
              userId: ctx.auth.user.id,
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        items,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    }),
});
