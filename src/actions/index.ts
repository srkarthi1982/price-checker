import { defineAction, ActionError, type ActionAPIContext } from "astro:actions";
import { z } from "astro:schema";
import {
  PriceSnapshots,
  PriceWatchItems,
  and,
  db,
  eq,
} from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

async function getOwnedItem(itemId: string, userId: string) {
  const [item] = await db
    .select()
    .from(PriceWatchItems)
    .where(and(eq(PriceWatchItems.id, itemId), eq(PriceWatchItems.userId, userId)));

  if (!item) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Price watch item not found.",
    });
  }

  return item;
}

export const server = {
  createPriceWatchItem: defineAction({
    input: z.object({
      productName: z.string().min(1),
      targetPrice: z.number().optional(),
      currency: z.string().optional(),
      productUrl: z.string().optional(),
      notes: z.string().optional(),
      isActive: z.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      const [item] = await db
        .insert(PriceWatchItems)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          productName: input.productName,
          targetPrice: input.targetPrice,
          currency: input.currency,
          productUrl: input.productUrl,
          notes: input.notes,
          isActive: input.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return { success: true, data: { item } };
    },
  }),

  updatePriceWatchItem: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        productName: z.string().optional(),
        targetPrice: z.number().optional(),
        currency: z.string().optional(),
        productUrl: z.string().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
      })
      .refine(
        (input) =>
          input.productName !== undefined ||
          input.targetPrice !== undefined ||
          input.currency !== undefined ||
          input.productUrl !== undefined ||
          input.notes !== undefined ||
          input.isActive !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedItem(input.id, user.id);

      const [item] = await db
        .update(PriceWatchItems)
        .set({
          ...(input.productName !== undefined ? { productName: input.productName } : {}),
          ...(input.targetPrice !== undefined ? { targetPrice: input.targetPrice } : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          ...(input.productUrl !== undefined ? { productUrl: input.productUrl } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          updatedAt: new Date(),
        })
        .where(eq(PriceWatchItems.id, input.id))
        .returning();

      return { success: true, data: { item } };
    },
  }),

  listPriceWatchItems: defineAction({
    input: z.object({
      includeInactive: z.boolean().default(false),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const items = await db
        .select()
        .from(PriceWatchItems)
        .where(
          input.includeInactive
            ? eq(PriceWatchItems.userId, user.id)
            : and(eq(PriceWatchItems.userId, user.id), eq(PriceWatchItems.isActive, true))
        );

      return { success: true, data: { items, total: items.length } };
    },
  }),

  addPriceSnapshot: defineAction({
    input: z.object({
      itemId: z.string().min(1),
      fetchedAt: z.date().optional(),
      price: z.number(),
      currency: z.string().optional(),
      source: z.string().optional(),
      success: z.boolean().optional(),
      message: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedItem(input.itemId, user.id);

      const [snapshot] = await db
        .insert(PriceSnapshots)
        .values({
          id: crypto.randomUUID(),
          itemId: input.itemId,
          fetchedAt: input.fetchedAt ?? new Date(),
          price: input.price,
          currency: input.currency,
          source: input.source,
          success: input.success ?? true,
          message: input.message,
        })
        .returning();

      return { success: true, data: { snapshot } };
    },
  }),

  listPriceSnapshots: defineAction({
    input: z.object({
      itemId: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedItem(input.itemId, user.id);

      const snapshots = await db
        .select()
        .from(PriceSnapshots)
        .where(eq(PriceSnapshots.itemId, input.itemId));

      return { success: true, data: { items: snapshots, total: snapshots.length } };
    },
  }),
};
