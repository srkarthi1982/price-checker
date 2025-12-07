import { defineTable, column, NOW } from "astro:db";

export const PriceWatchItems = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    productName: column.text(),
    targetPrice: column.number({ optional: true }),
    currency: column.text({ optional: true }),
    productUrl: column.text({ optional: true }),
    notes: column.text({ optional: true }),
    isActive: column.boolean({ default: true }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const PriceSnapshots = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    itemId: column.text({
      references: () => PriceWatchItems.columns.id,
    }),
    fetchedAt: column.date({ default: NOW }),
    price: column.number(),
    currency: column.text({ optional: true }),
    source: column.text({ optional: true }),
    success: column.boolean({ default: true }),
    message: column.text({ optional: true }),
  },
});

export const tables = {
  PriceWatchItems,
  PriceSnapshots,
} as const;
