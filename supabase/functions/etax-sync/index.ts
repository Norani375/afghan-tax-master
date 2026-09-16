import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claimsData.claims.sub as string;

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const action = String(body.action || 'status');
    const declarationIds: string[] = Array.isArray(body.declaration_ids) ? body.declaration_ids : [];

    if (!['submit', 'status'].includes(action)) {
      return json({ error: 'action must be "submit" or "status"' }, 400);
    }

    // تنظیمات اتصال کاربر
    const { data: settings, error: sErr } = await supabase
      .from('etax_settings')
      .select('base_url, taxpayer_id, enabled')
      .eq('user_id', userId)
      .maybeSingle();
    if (sErr) return json({ error: sErr.message }, 400);

    const apiKey = Deno.env.get('ETAX_API_KEY');
    const baseUrl = (settings?.base_url || '').trim().replace(/\/$/, '');

    // لایه اتصال هنوز پیکربندی نشده — پیام واضح، بدون شکست
    if (!settings?.enabled || !baseUrl || !apiKey) {
      return json({
        configured: false,
        reason: !settings?.enabled
          ? 'اتصال آنلاین E-Tax در تنظیمات فعال نیست.'
          : !baseUrl
            ? 'آدرس سرویس E-Tax وارد نشده است.'
            : 'کلید دسترسی سرویس E-Tax (ETAX_API_KEY) ذخیره نشده است.',
        message: 'وضعیت اظهارنامه‌ها را می‌توانید به صورت دستی ثبت و رهگیری کنید تا دسترسی رسمی وزارت مالیه فراهم شود.',
      });
    }

    if (declarationIds.length === 0) return json({ error: 'declaration_ids الزامی است' }, 400);

    const { data: decls, error: dErr } = await supabase
      .from('customs_declarations')
      .select('*')
      .in('id', declarationIds);
    if (dErr) return json({ error: dErr.message }, 400);

    const results: any[] = [];
    for (const d of decls ?? []) {
      const url = action === 'submit'
        ? `${baseUrl}/declarations`
        : `${baseUrl}/declarations/${encodeURIComponent(d.etax_ref_no || d.declaration_no)}`;

      const resp = await fetch(url, {
        method: action === 'submit' ? 'POST' : 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: action === 'submit'
          ? JSON.stringify({
              taxpayer_id: settings.taxpayer_id,
              declaration_no: d.declaration_no,
              declaration_type: d.declaration_type,
              customs_office: d.customs_office,
              declaration_date: d.declaration_date,
              tin: d.importer_tin,
              hs_code: d.hs_code,
              goods_description: d.goods_description,
              currency: d.currency,
              invoice_value: d.invoice_value,
              exchange_rate: d.exchange_rate,
              value_afn: d.value_afn,
              customs_duty: d.customs_duty,
              vat_amount: d.vat_amount,
              brt_amount: d.brt_amount,
              total_tax: d.total_tax,
            })
          : undefined,
      });

      const text = await resp.text();
      if (!resp.ok) {
        console.error(`E-Tax ${action} failed [${resp.status}]: ${text}`);
        results.push({ id: d.id, ok: false, status: resp.status, details: text });
        continue;
      }

      let payload: any = {};
      try { payload = JSON.parse(text); } catch { payload = { raw: text }; }

      const status = String(payload.status || 'submitted');
      const refNo = payload.reference_no || payload.ref_no || d.etax_ref_no || null;

      await supabase.from('customs_declarations').update({
        etax_ref_no: refNo,
        etax_status: status,
        etax_submitted_at: action === 'submit' ? new Date().toISOString() : d.etax_submitted_at,
        etax_clearance_no: payload.clearance_no ?? d.etax_clearance_no,
        etax_cleared_at: payload.cleared_at ?? d.etax_cleared_at,
        etax_last_message: payload.message ?? null,
        etax_synced_at: new Date().toISOString(),
      }).eq('id', d.id);

      await supabase.from('etax_events').insert({
        user_id: userId,
        declaration_id: d.id,
        status,
        ref_no: refNo,
        source: 'online',
        message: payload.message ?? null,
        payload,
      });

      results.push({ id: d.id, ok: true, status, ref_no: refNo });
    }

    return json({ configured: true, results });
  } catch (e) {
    console.error('etax-sync error:', e);
    return json({ error: e instanceof Error ? e.message : 'خطای نامشخص' }, 500);
  }
});
