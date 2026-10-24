---
sidebar_position: 2
title: Datenschutzerklärung
---

# Datenschutzerklärung

_Zuletzt aktualisiert: 24. Oktober 2026_

Bitbucket Review Reset erhebt, speichert und überträgt keine personenbezogenen Daten. Es gibt
keine Analyse, kein Tracking, keine Telemetrie und keinen Server dieses Projekts. Alles, was die
Erweiterung tut, passiert lokal in deinem Browser.

## Worauf die Erweiterung zugreift

### Review-Status auf Pull-Request-Seiten

Wenn du das Popup auf einem Pull Request in Bitbucket Cloud öffnest, listet die Erweiterung die
`localStorage`-Einträge auf, die **Bitbucket selbst** für diesen Pull Request geschrieben hat,
und löscht sie, wenn du **Review-Status zurücksetzen** drückst. Die Namen der Einträge und ihre
Größe werden dir im Popup angezeigt. Nichts wird aus dem Tab herauskopiert.

### Repository-Namen

Ein Pull Request kann über einen Link geöffnet werden, der UUIDs anstelle der Workspace- und
Repository-Namen verwendet. Um daraus wieder einen lesbaren Link zu machen, fragt die Erweiterung
die API von Bitbucket selbst (`/!api/2.0/repositories/…`) nach dem Repository-Namen – aus dem
Bitbucket-Tab heraus und mit der Sitzung, in der du bereits angemeldet bist. Diese Anfrage geht
an `bitbucket.org` und nirgendwo sonst.

### Deine Einstellungen

Gespeichert werden zwei Einstellungen: ob UUID-Links automatisch weitergeleitet werden, und die
Sprache der Oberfläche. Sie werden über die `storage.sync`-API des Browsers gespeichert. Wenn du
die Browser-Synchronisierung aktiviert hast, überträgt dein Browser sie über dein Browser-Konto
zwischen deinen eigenen Geräten. Sie enthalten keine personenbezogenen Daten.

## Berechtigungen

| Berechtigung | Wofür sie gebraucht wird |
| --- | --- |
| `activeTab` | Die Adresse des aktuellen Tabs lesen, sobald du auf das Symbol in der Leiste klickst, damit die Erweiterung weiß, welchen Pull Request du ansiehst. |
| `scripting` | Eine kurze Funktion im Bitbucket-Tab ausführen, um die Einträge zum Review-Status aufzulisten und zu löschen. |
| `storage` | Die beiden oben beschriebenen Einstellungen speichern. |
| `https://bitbucket.org/*` | Damit die Erweiterung auf Pull-Request-Seiten von Bitbucket funktioniert und UUID-Links umschreiben kann. |

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
