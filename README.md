# Zeiterfassung

Einfache Zeiterfassung fürs Handy (PWA, lässt sich auf den Homescreen legen).

- **▶ Jetzt starten / ❚❚ Pause / ■ Stoppen** mit Projekt und Notiz (was du gemacht hast); Pausen werden abgezogen
- **Zeit nachtragen** mit Datum, von–bis und Pause in Minuten; jeder Eintrag lässt sich antippen und bearbeiten oder löschen
- **15-Minuten-Takt:** jede angefangene Viertelstunde zählt, pro Eintrag nach Abzug der Pause gerundet (1:10 h → 1,25 h, 1:00 h → 1,00 h)
- **Übersicht** pro Monat: Gesamtstunden, Stunden je Projekt, Einträge je Tag mit Tagessumme
- **Excel-Export** (.xlsx) des angezeigten Monats: Blatt „Zeiten“ und Blatt „Projekte“ mit Summen
- **Projekte** anlegen, umbenennen, archivieren
- **Standort** optional beim Start speichern (📍, Link zu Google Maps)

Reines HTML/CSS/JS ohne Build-Schritt, Code liegt in `public/`.

## Daten zwischen Geräten synchronisieren (Supabase, kostenlos)

Ohne Einrichtung speichert die App nur im jeweiligen Browser. Für Handy + PC:

1. Auf [supabase.com](https://supabase.com) ein kostenloses Projekt anlegen.
2. Im Dashboard unter **SQL Editor** den Inhalt von [`supabase/schema.sql`](supabase/schema.sql) ausführen.
3. Unter **Project Settings → API** die *Project URL* und den *anon/publishable key* in [`public/config.js`](public/config.js) eintragen. Der Key ist öffentlich gedacht, deine Daten schützt Row Level Security.
4. Unter **Authentication → URL Configuration** die *Site URL* auf die Adresse der App setzen.
5. App öffnen, **Konto anlegen**, E-Mail bestätigen, anmelden.
6. Danach unter **Authentication → Providers → Email** „Allow new users to sign up“ ausschalten, damit niemand sonst ein Konto anlegt.

Hinweis: Kostenlose Supabase-Projekte pausieren nach einer Woche ohne Nutzung; bei täglicher Nutzung passiert das nicht, sonst im Dashboard wieder aktivieren.

## Hosting (GitHub Pages)

Der Workflow `.github/workflows/pages.yml` testet bei jedem Push und veröffentlicht `public/` von `main` auf GitHub Pages.
Einmalig: **Settings → Pages → Source: GitHub Actions**. GitHub Pages für *private* Repos braucht einen bezahlten GitHub-Plan; alternativ das Repo öffentlich machen (im Code steht nichts Geheimes) oder den Ordner `public/` bei Netlify/Cloudflare Pages hosten.

## Lokal

```sh
npm test            # Rundungslogik testen
npm start           # App unter http://localhost:3000
```
