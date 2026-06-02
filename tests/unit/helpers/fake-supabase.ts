type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

type Filter =
  | { type: "eq"; column: string; value: unknown }
  | { type: "in"; column: string; values: unknown[] }
  | { type: "lt"; column: string; value: unknown };

let idCounter = 0;

function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function valueMatches(rowValue: unknown, expected: unknown) {
  return rowValue === expected;
}

function matchesFilters(row: Row, filters: Filter[]) {
  return filters.every((filter) => {
    if (filter.type === "eq") return valueMatches(row[filter.column], filter.value);
    if (filter.type === "in") return filter.values.some((value) => valueMatches(row[filter.column], value));
    if (filter.type === "lt") return String(row[filter.column] ?? "") < String(filter.value);
    return true;
  });
}

class FakeQuery {
  private filters: Filter[] = [];
  private selectedColumns: string | null = null;
  private limitCount: number | null = null;
  private operation: "select" | "insert" | "update" | "upsert" = "select";
  private payload: Row[] | Row | null = null;
  private conflictColumns: string[] = [];

  constructor(
    private readonly tables: Tables,
    private readonly table: string,
  ) {
    this.tables[this.table] ??= [];
  }

  select(columns = "*") {
    this.selectedColumns = columns;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ type: "eq", column, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ type: "in", column, values });
    return this;
  }

  lt(column: string, value: unknown) {
    this.filters.push({ type: "lt", column, value });
    return this;
  }

  or() {
    return this;
  }

  order() {
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  insert(rows: Row[]) {
    this.operation = "insert";
    this.payload = rows;
    return this;
  }

  update(row: Row) {
    this.operation = "update";
    this.payload = row;
    return this;
  }

  upsert(rows: Row[], options?: { onConflict?: string }) {
    this.operation = "upsert";
    this.payload = rows;
    this.conflictColumns =
      options?.onConflict
        ?.split(",")
        .map((column) => column.trim())
        .filter(Boolean) ?? [];
    return this;
  }

  async maybeSingle() {
    const result = await this.resolve();
    return { data: (result.data as Row[])[0] ?? null, error: result.error };
  }

  async single() {
    const result = await this.resolve();
    const rows = result.data as Row[];
    return { data: rows[0] ?? null, error: result.error };
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: Row[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.resolve().then(onfulfilled, onrejected);
  }

  private async resolve(): Promise<{ data: Row[]; error: null }> {
    if (this.operation === "insert") {
      const rows: Row[] = ((this.payload as Row[]) ?? []).map((row): Row => ({
        id: row.id ?? nextId(this.table),
        ...row,
      }));
      this.tables[this.table].push(...rows);
      return { data: this.projectRows(rows), error: null };
    }

    if (this.operation === "upsert") {
      const rows: Row[] = ((this.payload as Row[]) ?? []).map((row): Row => ({
        id: row.id ?? nextId(this.table),
        ...row,
      }));
      const written: Row[] = [];

      for (const row of rows) {
        const existingIndex = this.conflictColumns.length
          ? this.tables[this.table].findIndex((candidate) =>
              this.conflictColumns.every((column) => candidate[column] === row[column]),
            )
          : -1;

        if (existingIndex >= 0) {
          this.tables[this.table][existingIndex] = {
            ...this.tables[this.table][existingIndex],
            ...row,
            id: this.tables[this.table][existingIndex].id,
          };
          written.push(this.tables[this.table][existingIndex]);
        } else {
          this.tables[this.table].push(row);
          written.push(row);
        }
      }

      return { data: this.projectRows(written), error: null };
    }

    if (this.operation === "update") {
      const updated: Row[] = [];
      this.tables[this.table] = this.tables[this.table].map((row) => {
        if (!matchesFilters(row, this.filters)) return row;
        const next = { ...row, ...(this.payload as Row) };
        updated.push(next);
        return next;
      });
      return { data: this.projectRows(updated), error: null };
    }

    const rows = this.tables[this.table].filter((row) => matchesFilters(row, this.filters));
    const limited = this.limitCount === null ? rows : rows.slice(0, this.limitCount);
    return { data: this.projectRows(limited), error: null };
  }

  private projectRows(rows: Row[]) {
    if (!this.selectedColumns || this.selectedColumns === "*") return rows;

    const columns = this.selectedColumns
      .split(",")
      .map((column) => column.trim())
      .filter(Boolean);

    if (columns.length === 0) return rows;

    return rows.map((row) => {
      const projected: Row = {};

      for (const column of columns) {
        const key = column.split(/\s+/)[0];
        projected[key] = row[key];
      }

      return projected;
    });
  }
}

export function createFakeSupabase(initialTables: Tables = {}) {
  const tables = Object.fromEntries(
    Object.entries(initialTables).map(([table, rows]) => [table, rows.map((row) => ({ ...row }))]),
  ) as Tables;

  return {
    tables,
    auth: {
      async getUser(token: string) {
        if (token === "valid-token") {
          return { data: { user: { id: "user-1", email: "creator@example.test" } }, error: null };
        }

        return { data: { user: null }, error: new Error("Invalid bearer token") };
      },
    },
    from(table: string) {
      return new FakeQuery(tables, table);
    },
  };
}
