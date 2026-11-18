# Khata Book (local-storage version)

Digital udhari register for shops. React + Vite + Tailwind CSS, Capacitor for Android. **All data is stored on the phone** (IndexedDB). No login, no cloud, no Firebase.

Features: customers with area grouping and search (5000+), Udhari/Jama entries with remark and receipt photo, running balance (integer paise, no rounding errors), Daily Bahi (totals per day), History with date range filters and CSV export, WhatsApp/SMS/Call buttons, full JSON backup and restore, CSV customer import.

## Get the APK (no computer needed)

1. Put this project in a GitHub repository (see the steps given in chat, Codespaces from a tablet works).
2. Every push to `main` automatically builds an APK (**Actions** tab → "Build Android APK"). You can also run it by hand: Actions → Build Android APK → Run workflow.
3. When it finishes (5–10 min), open the repo → **Releases** (right side) → download `app-debug.apk`.
4. Open the file on the phone and allow "install from this source" when asked.

The debug APK is for your own devices. For the Play Store you need a signed AAB (a later step).

## Important: backups
Data exists only on the device. Uninstalling the app or clearing its data deletes everything. Use Settings → Full backup regularly and save the file to Google Drive/WhatsApp. Restore from the same screen.

## Run on a computer (optional)
```bash
npm install
npm run dev
```

## Structure
```
src/lib/db.js            IndexedDB wrapper (transactions keep balances consistent)
src/context/DataContext  all reads/writes, backup/restore
src/hooks/useTxns.js     day / customer queries
src/pages/               Customers, CustomerDetail, DailyBahi, History, Settings
src/components/          forms, rows, layout
.github/workflows/android-apk.yml   cloud APK build
```

Convention: Udhari = Credit (customer owes more), Jama = Debit (payment received).
