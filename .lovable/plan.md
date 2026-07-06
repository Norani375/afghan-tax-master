
## هدف
ساخت یک‌مرحله‌ای سیستم گمرکی-مالیاتی روی زیرساخت موجود Lovable Cloud، مطابق با قوانین ARD افغانستان و ظرفیت ۵۰ اظهارنامه روزانه.

## ۱. تغییرات دیتابیس (یک migration)

### جدول `customs_declarations`
- ستون‌های کلیدی: `declaration_no` (unique)، `type` (import/export)، `customs_office` (تورخم/اسلام‌قلعه/کابل/حیرتان/میدان‌هوایی)، `declaration_date`، `company_id`، `importer_tin`، `hs_code`، `goods_description`، `country_origin/destination`، `quantity`، `unit`، `currency`، `invoice_value`، `exchange_rate`، `value_afn` (calc)، `customs_duty_rate`، `customs_duty`، `brt_rate` (2%)، `brt_amount`، `vat_rate` (10%)، `vat_amount`، `red_tax` (مالیات سرخ ۲٪)، `total_tax`، `payment_status`، `payment_date`، `receipt_no`، `broker_name`، `vehicle_vin`، `bill_of_lading_no`، `notes`

### جدول `exchange_rates`
- `currency_code` (USD/EUR/PKR/IRR)، `rate_to_afn`، `rate_date`، `source` (DAB/manual)
- unique(currency_code, rate_date)

### جدول `hs_tariffs`  
- `hs_code`، `description_fa`، `duty_rate`، `vat_applicable`، `restricted` (bool)

### جدول `tax_brackets`
- `bracket_type` (salary/rent/contractor)، `min_amount`، `max_amount`، `rate`، `fixed_deduction`

با seed اولیه نرخ‌های ماده ۴/۵۸/۶۰ قانون مالیات + نرخ ۲٪ BRT + ۱۰٪ VAT + آستانه ۵۰۰,۰۰۰ ماده ۷۲.

همه با RLS (company-scoped) + GRANT + audit trigger + updated_at.

## ۲. موتور محاسبات هوشمند (`src/lib/tax-engine.ts`)

توابع خالص:
- `calcSalaryTax(gross)` — پلکانی ماهانه (۰/۲/۱۰/۲۰٪ با آستانه‌های ۵۰۰۰/۱۲۵۰۰/۱۰۰۰۰۰)
- `calcRentTax(gross)` — ۱۰٪ / ۱۵٪ با آستانه ۱۰۰,۰۰۰
- `calcContractorTax(gross, hasLicense, yearlyTotal)` — ۲٪/۷٪ با آستانه ۵۰۰,۰۰۰ ماده ۷۲
- `calcBRT(income, sector)` — ۲٪/۴٪/۱۰٪
- `calcImportTaxes({invoiceValue, currency, hsRate, rate})` → {customsDuty, vat, brt, total}
- `calcLateFine(dueDate, paidDate, principal)` — ۰.۵٪ ماهانه (سقف)
- `calcCorporateTax(netIncome)` — ۲۰٪
- همه با unit تست قابل توسعه.

## ۳. تب جدید «اظهارنامه گمرکی» در `src/App.tsx`

فایل ماژول: `src/modules/CustomsDeclarationsTab.tsx`
- فرم درج با محاسبه زنده مالیات (خروجی موتور را نمایش می‌دهد)
- انتخاب ارز → نرخ خودکار از `exchange_rates` (آخرین rate_date)
- جستجو + فیلتر (نوع، گمرک، تاریخ، وضعیت پرداخت، TIN)
- ورود Excel با تبدیل تاریخ جلالی→میلادی (از الگوی موجود)
- خروجی PDF رسمی (فرمت SIGTAS طبق memory) + Excel
- بج‌ هشدار: TIN نامعتبر (طول ≠ ۱۰)، کالای ممنوعه (بر اساس hs_tariffs.restricted)، دیرکرد پرداخت

## ۴. صفحه نرخ ارز

زیر تب «تنظیمات» یا کارت روی داشبورد:
- جدول نرخ‌های ۷ روز اخیر
- دکمه «به‌روزرسانی از DAB» → edge function `fetch-exchange-rates` که با fetch به API عمومی DAB (اگر در دسترس) یا fallback به ورود دستی
- ورود دستی سریع

توجه: چون API عمومی مستند DAB متغیر است، edge function می‌نویسیم که چند endpoint معروف را تست کند و در صورت شکست پیام واضح بدهد؛ ورود دستی همیشه در دسترس.

## ۵. داشبورد اظهارنامه‌ها

کارت‌های جدید در داشبورد موجود:
- تعداد اظهارنامه امروز/ماه/سال (import vs export)
- مجموع درآمد مالیاتی امروز/ماه (customs + BRT + VAT)
- نمودار خطی روند روزانه ۳۰ روز
- نمودار Pie تفکیک گمرکات
- ۵ اظهارنامه اخیر
- هشدار پرداخت‌های دیرکرد

## ۶. گزارش تصفیه رسمی

دکمه «گزارش تصفیه» در تب اظهارنامه:
- انتخاب بازه + شرکت
- خروجی PDF با هدر رسمی (لوگو + TIN + دوره)، جدول اظهارنامه‌ها، جمع مالیات‌ها، امضاء
- ذخیره در `report_history` (جدول موجود)

## جزئیات فنی

- تمام مبالغ به Afghani ذخیره، ارز اصلی نگه‌داری می‌شود
- تاریخ‌ها Gregorian در DB، Jalali در UI (طبق memory)
- RLS: `company_id IN (user's companies)`؛ audit_logs trigger فعال
- محاسبات هم client (نمایش زنده) و هم server-side (validation در trigger پیش از insert) — trigger `validate_declaration_tax` مقادیر مالیات را دوباره حساب و در صورت مغایرت زیاد warning می‌دهد (نه reject، تا انعطاف بماند)
- فایل‌های جدید فقط: `src/lib/tax-engine.ts`, `src/modules/CustomsDeclarationsTab.tsx`, `supabase/functions/fetch-exchange-rates/index.ts`
- یک migration، یک edge function، حداقل ویرایش `src/App.tsx` (افزودن تب و کارت‌های داشبورد)

## خارج از محدوده این پیام
- یکپارچه‌سازی ASYCUDA و E-Tax (نیازمند دسترسی رسمی)
- RBAC چندسطحی گمرک/دلال/حسابرس (بعداً روی user_roles موجود اضافه می‌شود)
- Redis cache (در این حجم PostgREST کافی است)

پس از تأیید، migration اول ارسال می‌شود، سپس فایل‌ها.
