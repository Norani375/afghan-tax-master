/**
 * Shared print utility — opens a standalone print window with company header (optional logo) and footer.
 * Uses pure inline CSS so it works independently of Tailwind.
 */
export interface PrintOptions {
  /** Browser tab title */
  title: string;
  /** Company name shown in the header */
  companyName: string;
  /** Base64 data-URL of the company logo (optional) */
  companyLogo?: string;
  /** Page heading like "گزارش عواید" */
  pageTitle: string;
  /** Main HTML content (tables, etc.) */
  content: string;
  /** Formatted date string – defaults to today in fa-AF locale */
  displayDate?: string;
}

export function openPrintWindow(opts: PrintOptions) {
  const { title, companyName, companyLogo, pageTitle, content } = opts;
  const dateStr =
    opts.displayDate ||
    new Date().toLocaleDateString('fa-AF', { year: 'numeric', month: 'long', day: 'numeric' });

  const logoHTML = companyLogo
    ? `<div style="margin-bottom:8pt"><img src="${companyLogo}" style="max-height:55pt;max-width:110pt;object-fit:contain" /></div>`
    : '';

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="UTF-8"/>
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{font-family:'Vazirmatn','Tahoma',sans-serif;font-size:10pt;color:#1a1a1a;background:#fff;direction:rtl}
@page{size:A4;margin:10mm 12mm}
@media print{.no-print{display:none!important}}
table{width:100%;border-collapse:collapse}
.thead th{background:#1e293b;color:#fff;padding:7pt 10pt;font-weight:600;font-size:9pt}
.total-row{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:700}
.total-row td{padding:7pt 10pt}
.sec-title{font-size:10.5pt;font-weight:700;color:#1e293b;padding:8pt 12pt;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:6pt 6pt 0 0;border-bottom:2pt solid #6366f1;margin-top:16pt;display:flex;align-items:center;gap:6pt}
.sec-body{background:#fff;border:1pt solid #e8e8e8;border-top:none;border-radius:0 0 6pt 6pt;padding:10pt;margin-bottom:4pt}
</style>
</head>
<body style="padding:10pt">

<!-- HEADER -->
<div style="text-align:center;padding:16pt 0 14pt;margin-bottom:12pt;background:linear-gradient(135deg,#1e1b4b,#312e81,#4338ca);border-radius:10pt;color:#fff;position:relative;overflow:hidden">
  <div style="position:absolute;top:-30pt;right:-30pt;width:100pt;height:100pt;background:rgba(255,255,255,0.05);border-radius:50%"></div>
  <div style="position:absolute;bottom:-20pt;left:-20pt;width:80pt;height:80pt;background:rgba(255,255,255,0.03);border-radius:50%"></div>
  ${logoHTML}
  <div style="font-size:14pt;font-weight:900;letter-spacing:0.03em">${companyName}</div>
  <div style="width:60pt;height:2pt;background:linear-gradient(90deg,transparent,#fbbf24,transparent);margin:8pt auto"></div>
  <div style="font-size:12pt;font-weight:700;color:#fde68a">${pageTitle}</div>
  <div style="font-size:8.5pt;color:rgba(255,255,255,0.5);margin-top:4pt">تاریخ تهیه: ${dateStr}</div>
</div>

${content}

<!-- FOOTER -->
<div style="margin-top:20pt;text-align:center;border-top:1pt solid #f0f0f0;padding-top:10pt">
  <div style="font-size:8pt;color:#94a3b8">سیستم حسابداری صرافی — ${dateStr}</div>
  <div style="font-size:7.5pt;color:#b0b0b0;margin-top:3pt">طراحی و توسعه: <strong>Manochehr Norani</strong> — تماس: 0744173723</div>
</div>

</body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('لطفاً پاپ‌آپ را مجاز کنید');
    return;
  }
  win.document.write(html);
  win.document.close();
  if (win.document.fonts && win.document.fonts.ready) {
    win.document.fonts.ready.then(() => {
      setTimeout(() => { win.focus(); win.print(); }, 500);
    });
  } else {
    setTimeout(() => { win.focus(); win.print(); }, 2500);
  }
}
