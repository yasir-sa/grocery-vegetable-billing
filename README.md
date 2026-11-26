# Grocery & Vegetable Billing App

An offline-first billing, stock and profit app built for a real two-in-one shop (grocery + vegetables) in Tamil Nadu. The owner uses it daily on an Android phone. It works fully offline, in **Tamil and English**.

## Features
- **Fast billing.** Tap-to-add items with photos, kg/g/pcs units, quick quantity buttons, discounts, and bills shared as PDF or on WhatsApp.
- **Two shops in one.** Grocery and vegetable items are kept separate, with combined or per-shop reports.
- **Stock with FIFO lots.** Each purchase is a lot with its own cost price. Sales take the oldest stock first, so profit is accurate.
- **Dustbin (wastage).** Rotten or damaged stock is recorded as a loss at its real cost.
- **Sales & profit.** Today, week, month and year reports in plain language: *sales − cost − wastage − expenses = profit in hand*, with charts and a PDF report.
- **Expenses.** Rent, electricity, transport and more are deducted from profit.
- **Backup & restore.** Export and import all data as a file.
- **Bilingual UI.** Tamil and English, with light and dark themes.

## Tech Stack
React 18 · Vite · IndexedDB (offline storage) · Capacitor 6 (Android APK) · jsPDF + html2canvas (PDF bills/reports)

## Run locally
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

## Build the Android APK
```bash
npm run build
npx cap add android   # first time only
npx cap sync android
cd android && ./gradlew assembleRelease
```
Release signing keys are kept outside the repository.

## Author
**Yasir S A** — Full Stack Developer · [GitHub](https://github.com/yasir-sa) · [LinkedIn](https://linkedin.com/in/yasir-sa)
