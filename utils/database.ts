import { TaxRecord, TaxDeclaration, DashboardStats } from '../types';

const PROJECT_ID = 'small-hat-25521290';
const CONN = 'conn_aknk1s5heqd0609ya6cq';

async function runSql(sql: string): Promise<unknown[]> {
  const result = await window.tasklet.runTool(`${CONN}__run_sql`, {
    projectId: PROJECT_ID,
    sql,
  });
  if (!Array.isArray(result)) {
    console.error('Expected array from run_sql, got:', result);
    throw new Error('Expected array from run_sql');
  }
  return result;
}

// =================== TAX RECORDS ===================

export async function saveTaxRecord(
  taxType: string, taxpayerName: string, grossIncome: number,
  deductions: number, taxableIncome: number, taxAmount: number,
  taxRate: number, period: string, notes: string
): Promise<TaxRecord> {
  const tn = taxpayerName.replace(/'/g, "''");
  const n = notes.replace(/'/g, "''");
  const rows = await runSql(
    `INSERT INTO tax_records (tax_type, taxpayer_name, gross_income, deductions, taxable_income, tax_amount, tax_rate, period, notes)
    VALUES ('${taxType}', '${tn}', ${grossIncome}, ${deductions}, ${taxableIncome}, ${taxAmount}, ${taxRate}, '${period}', '${n}')
    RETURNING *`
  );
  return rows[0] as TaxRecord;
}

export async function loadTaxRecords(limit: number): Promise<TaxRecord[]> {
  const rows = await runSql(`SELECT * FROM tax_records ORDER BY created_at DESC LIMIT ${limit}`);
  return rows as TaxRecord[];
}

export async function deleteTaxRecord(id: number): Promise<void> {
  await runSql(`DELETE FROM tax_records WHERE id = ${id}`);
}

// =================== TAX DECLARATIONS ===================

export async function loadDeclarations(): Promise<TaxDeclaration[]> {
  const rows = await runSql(
    `SELECT * FROM tax_declarations ORDER BY tax_category, period DESC`
  );
  return rows as TaxDeclaration[];
}

export async function saveDeclaration(d: Omit<TaxDeclaration, 'id' | 'created_at' | 'updated_at'>): Promise<TaxDeclaration> {
  const cat = d.tax_category.replace(/'/g, "''");
  const per = d.period.replace(/'/g, "''");
  const fd = d.filing_due_date.replace(/'/g, "''");
  const pd = d.payment_due_date.replace(/'/g, "''");
  const sd = d.submission_date.replace(/'/g, "''");
  const n = (d.notes || '').replace(/'/g, "''");
  const rows = await runSql(
    `INSERT INTO tax_declarations (tax_category, period, filing_due_date, payment_due_date, submission_date, assessment, paid, balance, notes)
    VALUES ('${cat}', '${per}', '${fd}', '${pd}', '${sd}', ${d.assessment}, ${d.paid}, ${d.balance}, '${n}')
    RETURNING *`
  );
  return rows[0] as TaxDeclaration;
}

export async function updateDeclaration(id: number, fields: Partial<TaxDeclaration>): Promise<TaxDeclaration> {
  const sets: string[] = [];
  if (fields.tax_category !== undefined) sets.push(`tax_category = '${fields.tax_category.replace(/'/g, "''")}'`);
  if (fields.period !== undefined) sets.push(`period = '${fields.period.replace(/'/g, "''")}'`);
  if (fields.filing_due_date !== undefined) sets.push(`filing_due_date = '${fields.filing_due_date.replace(/'/g, "''")}'`);
  if (fields.payment_due_date !== undefined) sets.push(`payment_due_date = '${fields.payment_due_date.replace(/'/g, "''")}'`);
  if (fields.submission_date !== undefined) sets.push(`submission_date = '${fields.submission_date.replace(/'/g, "''")}'`);
  if (fields.assessment !== undefined) sets.push(`assessment = ${fields.assessment}`);
  if (fields.paid !== undefined) sets.push(`paid = ${fields.paid}`);
  if (fields.balance !== undefined) sets.push(`balance = ${fields.balance}`);
  if (fields.notes !== undefined) sets.push(`notes = '${fields.notes.replace(/'/g, "''")}'`);
  sets.push(`updated_at = NOW()`);
  const rows = await runSql(`UPDATE tax_declarations SET ${sets.join(', ')} WHERE id = ${id} RETURNING *`);
  return rows[0] as TaxDeclaration;
}

export async function deleteDeclaration(id: number): Promise<void> {
  await runSql(`DELETE FROM tax_declarations WHERE id = ${id}`);
}

// =================== DASHBOARD STATS ===================

export async function getDashboardStats(): Promise<DashboardStats> {
  const [totalRows, categoryRows] = await Promise.all([
    runSql(`SELECT
      COALESCE(SUM(ABS(assessment)), 0) as total_assessment,
      COALESCE(SUM(paid), 0) as total_paid,
      COALESCE(SUM(balance), 0) as total_balance,
      COUNT(*) as total_records
    FROM tax_declarations`),
    runSql(`SELECT
      tax_category as category,
      COALESCE(SUM(ABS(assessment)), 0) as total_assessment,
      COALESCE(SUM(paid), 0) as total_paid,
      COUNT(*) as count
    FROM tax_declarations
    GROUP BY tax_category
    ORDER BY total_assessment DESC`),
  ]);

  const total = totalRows[0] as Record<string, string>;
  return {
    totalAssessment: Number(total.total_assessment),
    totalPaid: Number(total.total_paid),
    totalBalance: Number(total.total_balance),
    totalRecords: Number(total.total_records),
    categories: (categoryRows as Record<string, string>[]).map((r) => ({
      category: r.category,
      total_assessment: Number(r.total_assessment),
      total_paid: Number(r.total_paid),
      count: Number(r.count),
    })),
  };
}
