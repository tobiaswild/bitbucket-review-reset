---
sidebar_position: 2
title: Datenschutzerklärung
---

# Datenschutzerklärung

_Zuletzt aktualisiert: 13. November 2026_

Bitbucket Review Reset erhebt, speichert und überträgt keine personenbezogenen Daten. Es gibt
keine Analyse, kein Tracking, keine Telemetrie und keinen Server dieses Projekts. Alles, was die
Erweiterung tut, passiert lokal in deinem Browser.

## Worauf die Erweiterung zugreift

### Review-Status auf Pull-Request-Seiten

Wenn du das Popup auf einem Pull Request in Bitbucket Cloud öffnest, liest die Erweiterung die
`localStorage`-Einträge, die **Bitbucket selbst** für diesen Pull Request geschrieben hat, und
zeigt dir, was darin steht: die als angesehen markierten Dateien, den zuletzt geprüften Commit
und wann dieser Eintrag abläuft. Wenn du den Review-Status zurücksetzt, über das Popup, das
Tastenkürzel, das Kontextmenü der Seite oder den Button auf der Seite, löscht sie diese Einträge oder nur die Teile bzw.
Dateien, die du ausgewählt hast.

Solange ein Pull Request geöffnet ist, zählt die Erweiterung außerdem die als angesehen
markierten Dateien, alle zwei Sekunden, solange der Tab sichtbar ist, und zeigt diese Zahl am
Symbol in der Leiste an. Nur die Zahl wird von der Seite an die Erweiterung übergeben.

Damit du ein Zurücksetzen rückgängig machen kannst, werden die gelöschten Einträge 10 Minuten
lang im Sitzungsspeicher der Erweiterung (`storage.session`) aufbewahrt. Er bleibt auf deinem
Gerät, wird nie synchronisiert und beim Schließen des Browsers geleert. Nichts verlässt deinen
Browser.

### Repository-Namen

Ein Pull Request kann über einen Link geöffnet werden, der UUIDs anstelle der Workspace- und
Repository-Namen verwendet. Um daraus wieder einen lesbaren Link zu machen, fragt die Erweiterung
die API von Bitbucket selbst (`/!api/2.0/repositories/…`) nach dem Repository-Namen – aus dem
Bitbucket-Tab heraus und mit der Sitzung, in der du bereits angemeldet bist. Diese Anfrage geht
an `bitbucket.org` und nirgendwo sonst.

Damit der nächste Link auf dasselbe Repository sofort weitergeleitet werden kann, merkt sich die
Erweiterung den ermittelten Namen zusammen mit den UUIDs aus dem Link – höchstens 14 Tage lang und
für maximal 200 Repositories. Diese Namen werden über die `storage.local`-API des Browsers
gespeichert, bleiben also auf diesem Gerät und werden nicht synchronisiert. Auf der
Einstellungsseite der Erweiterung siehst du, wie viele gespeichert sind, und kannst sie jederzeit
mit **Leeren** löschen.

### Deine Einstellungen

Gespeichert werden fünf Einstellungen: ob UUID-Links automatisch weitergeleitet werden, ob die
Seite nach dem Zurücksetzen neu geladen wird, ob der Zurücksetzen-Button auf Pull-Request-Seiten
erscheint, ob das Symbol in der Leiste die Zahl der angesehenen Dateien zeigt, und die Sprache
der Oberfläche. Sie werden über
die `storage.sync`-API des Browsers gespeichert. Wenn du die Browser-Synchronisierung aktiviert hast, überträgt dein Browser sie über dein Browser-Konto
zwischen deinen eigenen Geräten. Sie enthalten keine personenbezogenen Daten.

## Berechtigungen

| Berechtigung | Wofür sie gebraucht wird |
| --- | --- |
| `activeTab` | Die Adresse des aktuellen Tabs lesen, sobald du auf das Symbol in der Leiste klickst, das Tastenkürzel drückst oder den Eintrag im Kontextmenü wählst, damit die Erweiterung weiß, welchen Pull Request du ansiehst. |
| `contextMenus` | **Review-Status dieses Pull Requests zurücksetzen** (und direkt nach einem Zurücksetzen **Letztes Zurücksetzen dieses Pull Requests rückgängig machen**) zum Kontextmenü der Seite auf Pull Requests hinzufügen. |
| `scripting` | Eine kurze Funktion im Bitbucket-Tab ausführen, um die Einträge zum Review-Status aufzulisten und zu löschen. |
| `storage` | Die oben beschriebenen Einstellungen und gemerkten Repository-Namen speichern und, für 10 Minuten, die Einträge deines letzten Zurücksetzens. |
| `https://bitbucket.org/*` | Damit die Erweiterung auf Pull-Request-Seiten von Bitbucket funktioniert: dort den Zurücksetzen-Button und die Zahl der angesehenen Dateien anzeigen und UUID-Links umschreiben. |

## Weitergabe von Daten

Keine. Es werden keine Daten verkauft, geteilt oder an Dritte weitergegeben, und keine Daten
werden für Werbung, Profilbildung oder Kreditprüfung verwendet.

## Quellcode

Die Erweiterung ist Open Source. Du kannst jede Zeile unter
[github.com/tobiaswild/bitbucket-review-reset](https://github.com/tobiaswild/bitbucket-review-reset)
nachlesen.

## Änderungen dieser Erklärung

Wenn sich diese Erklärung ändert, wird die aktualisierte Fassung mit neuem Datum auf dieser Seite
veröffentlicht.

## Kontakt

Fragen oder Anliegen: Bitte eröffne ein Issue unter
[github.com/tobiaswild/bitbucket-review-reset/issues](https://github.com/tobiaswild/bitbucket-review-reset/issues).
