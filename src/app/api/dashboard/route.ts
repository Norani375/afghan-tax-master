import { NextResponse } from 'next/server';
import { query } from '@/utils/db';

export async function GET() {
  try {
    const [totalRows, categoryRows] = await Promise.all([
      query(`SELECT
        COALESCE(SUM(ABS(assessment)), 0) as total_assessment,
        COALESCE(SUM(paid), 0) as total_paid,
        COALESCE(SUM(balance), 0) as total_balance,
        COUNT(*) as total_records
      FROM tax_declarations`),
      query(`SELECT
        tax_category as category,
        COALESCE(SUM(ABS(assessment)), 0) as total_assessment,
        COALESCE(SUM(paid), 0) as total_paid,
        COUNT(*) as count
      FROM tax_declarations
      GROUP BY tax_category
      ORDER BY total_assessment DESC`),
    ]);

    const total = totalRows[0] as Record<string, string>;
    const stats = {
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

    return NextResponse.json(stats);
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard stats' }, { status: 500 });
  }
}
