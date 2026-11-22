# لوحة تحكم المشرفين — نسخة الويب

لوحة ويب ثابتة (HTML/JS بس) بتقرا وتكتب على نفس Firestore بتاع التطبيق.
الرقم السري: نفس رقم التطبيق (2612) — متخزّن كـ SHA-256 hash في الكود (ديمو تخرج، مش حماية إنتاجية).

## النشر على Firebase Hosting (من لابتوبك — دقيقين بالظبط)

1. افتح Terminal / PowerShell في فولدر المشروع (نفس الفولدر اللي فيه `firebase.json`)
2. سجّل دخولك بحساب جوجل اللي عليه المشروع:

   ```
   npx firebase-tools login
   ```

3. انشر:

   ```
   npx firebase-tools deploy --only hosting
   ```

4. هيظهرلك لينك زي:

   ```
   https://tareeqak-aman-bfebc.web.app
   ```

   افتحه، اكتب الرقم السري، وابدأ إدارة البلاغات من المتصفح.

## ملاحظات

- مفيش أي خطوة build — الفولدر ده كله ملف `index.html` واحد ثابت.
- تغيير الحالة بيكتب على Firestore بنفس شكل التطبيق (`status` + `statusHistory`)، فبيظهر في التطبيق فورًا.
- لو غيّرت الرقم السري في التطبيق (`src/config/admin.js`)، اعمل hash جديد وحدّث `PIN_HASH` في `index.html`:
  `python3 -c "import hashlib; print(hashlib.sha256(b'NEWPIN').hexdigest())"` (أو أي أداة sha256 أونلاين).
- `.firebaserc` فيه اسم المشروع (`tareeqak-aman-bfebc`) فمش هتحتاج تحدده في كل مرة.
