# دليل رفع التطبيق — منصة الرؤية الذهبية

## المتطلبات الأساسية

| الأداة | الإصدار | رابط التثبيت |
|--------|---------|-------------|
| Node.js | 18+ | https://nodejs.org |
| EAS CLI | آخر إصدار | `npm install -g eas-cli` |
| Expo Go أو Dev Client | — | من متجر التطبيقات |

---

## الخطوة 1 — إنشاء حساب Expo وربط المشروع

```bash
# تسجيل الدخول إلى Expo
eas login

# ربط المشروع بـ EAS (يُنشئ projectId تلقائيًا)
cd artifacts/ustadhi-mobile
eas init
```

بعد تشغيل `eas init`، انسخ الـ `projectId` الذي ظهر وضعه في `app.json`:
```json
"extra": {
  "eas": {
    "projectId": "XXXXX-XXXX-XXXX-XXXX-XXXXXXXX"
  }
}
```

---

## الخطوة 2 — بناء APK للاندرويد (مباشر بدون متجر)

```bash
# APK جاهز للتثبيت المباشر (بدون Play Store)
eas build --profile production-apk --platform android
```

بعد انتهاء البناء (10–20 دقيقة)، سيعطيك EAS رابطًا لتحميل ملف `.apk` مباشرةً.

---

## الخطوة 3 — بناء AAB لـ Google Play Store

```bash
# App Bundle للرفع على Play Store
eas build --profile production --platform android
```

**خطوات رفع Android على Play Console:**
1. افتح https://play.google.com/console
2. أنشئ تطبيقًا جديدًا
3. في قسم **Production → Releases** → ارفع ملف `.aab`
4. Package Name يجب أن يطابق: `com.ustadhi.mobile`

---

## الخطوة 4 — بناء iOS للـ App Store

### متطلبات Apple:
- حساب Apple Developer ($99/سنة): https://developer.apple.com
- Bundle Identifier مسجّل: `com.ustadhi.mobile`
- شهادات موقّعة (EAS يتولى هذا تلقائيًا)

```bash
# بناء iOS للمتجر
eas build --profile production --platform ios
```

**خطوات رفع iOS على App Store Connect:**
1. افتح https://appstoreconnect.apple.com
2. أنشئ تطبيقًا جديدًا مع Bundle ID: `com.ustadhi.mobile`
3. في `eas.json` حدّث:
   ```json
   "ios": {
     "appleId": "بريدك@apple.com",
     "ascAppId": "رقم_التطبيق_من_App_Store_Connect",
     "appleTeamId": "معرف_الفريق_من_Apple_Developer"
   }
   ```
4. ارفع التطبيق تلقائيًا:
   ```bash
   eas submit --profile production --platform ios
   ```

---

## الخطوة 5 — رفع Android تلقائيًا على Play

1. من Play Console، أنشئ **Service Account** وحمّل ملف JSON.
2. ضع الملف في `artifacts/ustadhi-mobile/google-play-key.json`
3. أضفه لـ `.gitignore` (لا ترفعه على GitHub)
4. شغّل:
   ```bash
   eas submit --profile production --platform android
   ```

---

## بناء الاثنين معًا في أمر واحد

```bash
eas build --profile production --platform all
```

---

## ملاحظات مهمة

| الإعداد | القيمة الحالية | ملاحظة |
|---------|----------------|--------|
| iOS Bundle ID | `com.ustadhi.mobile` | يجب تسجيله في Apple Developer |
| Android Package | `com.ustadhi.mobile` | لا يمكن تغييره بعد النشر |
| Version | `1.0.0` | غيّرها في `app.json` لكل إصدار |
| Build Number (iOS) | `1` | يزيد تلقائيًا مع `autoIncrement: true` |
| Version Code (Android) | `1` | يزيد تلقائيًا مع `autoIncrement: true` |

### الأيقونات والـ Splash:
- الأيقونة الحالية: `./assets/images/icon.png`
- يجب أن تكون **1024×1024 px** بدون شفافية للـ App Store
- الـ Splash: خلفية `#101D36` (كحلي) مع الأيقونة في المنتصف

---

## تتبع حالة البناء

```bash
# عرض آخر بناء
eas build:list

# مشاهدة الـ logs مباشرة
eas build:view
```

أو تابع من لوحة الويب: https://expo.dev/accounts/[username]/projects/ustadhi-mobile/builds
