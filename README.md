# سيرفر الأونلاين - تعليمات الاستضافة

هاد سيرفر صغير (Node.js) وظيفته بس يوصل اللاعبين ببعض (غرف بكود) ويمرر البيانات بينهم أثناء اللعب.
لازم يشتغل 24/7 على الإنترنت شان يقدر أي حدا يلعب من أي مكان.

## الطريقة الأسهل (مجانية) — Render.com

1. اعمل حساب على https://render.com
2. ارفع مجلد `server` هاد لمستودع GitHub (لحاله أو جوا مشروعك)
3. من لوحة Render: **New +** → **Web Service**
4. اربطه بالمستودع، واختار:
   - **Root Directory**: `server` (إذا رفعت كل المشروع سوا)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. اضغط **Create Web Service** واستنى لين يخلص البناء (Deploy)
6. Render رح يعطيك رابط شبيه بـ:
   `https://car-combat-relay.onrender.com`
7. حوّل الرابط لصيغة WebSocket (بدّل `https://` بـ `wss://`):
   `wss://car-combat-relay.onrender.com`

## بعدين، بالمشروع

افتح ملف `scripts/network_manager.gd` وبدّل هاد السطر بالرابط تبعك:

```gdscript
const SERVER_URL := "wss://car-combat-relay.onrender.com"
```

## ملاحظة مهمة عن الفريّة (Free Tier)

خطة Render المجانية "بتنام" السيرفر إذا ما حدا استخدمه لمدة، وبياخد كم ثانية يصحى أول مرة.
هاي طبيعية وما بتأثر على اللعب أول ما يتوصل الكل.

## تجربة محلية (اختياري، بس شان تتأكد الكود شغال)

```
cd server
npm install
npm start
```
رح يشتغل على `ws://localhost:8080`
