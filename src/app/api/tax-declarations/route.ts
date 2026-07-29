import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export async function GET() {
  try {
    const rows = await query('SELECT * FROM tax_declarations ORDER BY tax_category, period DESC');
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/tax-declarations error:', error);
    return NextResponse.json({ error: 'Failed to load declarations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tax_category, period, filing_due_date, payment_due_date, submission_date, assessment, paid, balance, notes } = body;
    const rows = await query(
      `INSERT INTO tax_declarations (tax_category, period, filing_due_date, payment_due_date, submission_date, assessment, paid, balance, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [tax_category, period, filing_due_date || '', payment_due_date || '', submission_date || '', assessment || 0, paid || 0, balance || 0, notes || '']
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('POST /api/tax-declarations error:', error);
    return NextResponse.json({ error: 'Failed to save declaration' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const sets: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;
    const allowedFields = ['tax_category', 'period', 'filing_due_date', 'payment_due_date', 'submission_date', 'assessment', 'paid', 'balance', 'notes'];
    for (const field of allowedFields) {
      if (fields[field] !== undefined) {
        sets.push(`${field} = $${paramIndex}`);
        params.push(fields[field]);
        paramIndex++;
      }
    }
    sets.push(`updated_at = NOW()`);
    params.push(id);
    const rows = await query(`UPDATE tax_declarations SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`, params);
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('PUT /api/tax-declarations error:', error);
    return NextResponse.json({ error: 'Failed to update declaration' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    await query('DELETE FROM tax_declarations WHERE id = $1', [parseInt(id, 10)]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/tax-declarations error:', error);
    return NextResponse.json({ error: 'Failed to delete declaration' }, { status: 500 });
  }
}
