# FA Apparels Android app

The APK embeds the full FA Apparels UI (login, inventory, orders, settings, etc.).
It is **not** a browser shortcut — screens run inside the app.

Stock data still comes from the Nest API on your PC (same Wi‑Fi).

## Build

```powershell
cd apps/web
npm run build

cd ../mobile
npx cap sync android

$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
cd android
.\gradlew.bat assembleDebug
```

APK:

- `apps/mobile/dist/FA-Apparels.apk`
- Desktop copy: `FA-Apparels.apk`

## Use

1. Install the APK on the phone.
2. Start API + data on the PC (`npm run dev:api`). Web dev server is optional for the phone.
3. Open **FA Apparels** on the phone → login screen appears in the app.
4. Login: `farooqpatel259` / `farooqpatel2006`
5. If data does not load, open **Settings → Mobile / API server** and set  
   `http://YOUR-PC-IP:4000/api/v1`
