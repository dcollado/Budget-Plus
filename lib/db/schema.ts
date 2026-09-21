import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Todo el dinero se guarda en centavos de USD (entero).

export const accountType = pgEnum("account_type", [
  "cash",
  "bank",
  "card",
  "loan",
]);
export const categoryKind = pgEnum("category_kind", ["expense", "income"]);
export const transactionType = pgEnum("transaction_type", [
  "expense",
  "income",
  "transfer",
]);
export const transactionSource = pgEnum("transaction_source", [
  "manual",
  "import",
  "chat",
  "qr",
]);

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    role: text("role").notNull().default("member"),
  },
  (t) => [index("members_household_idx").on(t.householdId)]
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: accountType("type").notNull(),
    // null = cuenta conjunta
    ownerMemberId: uuid("owner_member_id").references(() => members.id, {
      onDelete: "set null",
    }),
    openingBalanceCents: integer("opening_balance_cents").notNull().default(0),
    archived: boolean("archived").notNull().default(false),
  },
  (t) => [index("accounts_household_idx").on(t.householdId)]
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: categoryKind("kind").notNull(),
    archived: boolean("archived").notNull().default(false),
  },
  (t) => [index("categories_household_idx").on(t.householdId)]
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    transferAccountId: uuid("transfer_account_id").references(() => accounts.id),
    categoryId: uuid("category_id").references(() => categories.id),
    type: transactionType("type").notNull(),
    // Siempre positivo; el signo lo da `type`.
    amountCents: integer("amount_cents").notNull(),
    date: date("date").notNull(),
    payee: text("payee").notNull().default(""),
    note: text("note").notNull().default(""),
    // quién lo registró
    createdByMemberId: uuid("created_by_member_id")
      .notNull()
      .references(() => members.id),
    // de quién es el gasto; null = conjunto
    ownerMemberId: uuid("owner_member_id").references(() => members.id),
    source: transactionSource("source").notNull().default("manual"),
    externalId: text("external_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("transactions_household_date_idx").on(t.householdId, t.date),
    index("transactions_account_idx").on(t.accountId),
  ]
);
