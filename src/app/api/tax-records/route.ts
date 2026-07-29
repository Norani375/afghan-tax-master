import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const rows = await query('SELECT * FROM tax_records ORDER BY created_at DESC LIMIT $1', [limit]);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/tax-records error:', error);
    return NextResponse.json({ error: 'Failed to load tax records' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tax_type, taxpayer_name, gross_income, deductions, taxable_income, tax_amount, tax_rate, period, notes } = body;
    const rows = await query(
      `INSERT INTO tax_records (tax_type, taxpayer_name, gross_income, deductions, taxable_income, tax_amount, tax_rate, period, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [tax_type, taxpayer_name || '', gross_income, deductions || 0, taxable_income, tax_amount, tax_rate, period, notes || '']
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('POST /api/tax-records error:', error);
    return NextResponse.json({ error: 'Failed to save tax record' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    await query('DELETE FROM tax_records WHERE id = $1', [parseInt(id, 10)]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/tax-records error:', error);
    return NextResponse.json({ error: 'Failed to delete tax record' }, { status: 500 });
  }
}
