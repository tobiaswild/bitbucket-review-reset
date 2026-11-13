---
sidebar_position: 1
slug: /
---

# Einführung

Bitbucket Review Reset ist eine Chrome-Erweiterung, die den lokal gespeicherten Review-Fortschritt („angesehene“ Dateien und zuletzt geprüfter Commit) für den Bitbucket-Cloud-Pull-Request im aktuellen Tab löscht.

## Funktionsweise

Bitbucket speichert diese Daten im `localStorage` unter drei Schlüsseln pro PR:

- `{workspace}/{repo}/{id}:files-reviewed-state`
- `last-reviewed-commit:{workspace}/{repo}/{id}`
- `__storejs_expire_mixin_last-reviewed-commit:{workspace}/{repo}/{id}`

## Verwendung

Öffne einen PR, klicke auf das Symbol in der Toolbar, prüfe die aufgelisteten Schlüssel und klicke auf **Review-Status zurücksetzen**. Anschließend wird die Seite neu geladen, sofern du das in den Einstellungen nicht abschaltest. Ohne Neuladen zeigt Bitbucket den zurückgesetzten Stand beim nächsten Laden der Seite.

Schneller ohne Popup: Drücke auf einem Pull Request <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> oder wähle per Rechtsklick auf die Seite **Review-Status dieses Pull Requests zurücksetzen**. <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>U</kbd> macht das letzte Zurücksetzen rückgängig; solange das möglich ist, bietet auch das Kontextmenü **Letztes Zurücksetzen dieses Pull Requests rückgängig machen** an. Die Kürzel lassen sich in den Tastenkürzel-Einstellungen des Browsers für Erweiterungen ändern, verlinkt auf der Einstellungsseite der Erweiterung.

Um nur einen Teil zurückzusetzen, entferne vor dem Klick das Häkchen bei den **angesehenen Dateien** oder beim **zuletzt geprüften** Commit. Unter **Dateien anzeigen** kannst du außerdem einzelne Dateien auswählen und wieder als nicht angesehen markieren, z.B. um dir eine Datei noch einmal anzusehen.

Versehentlich zurückgesetzt? Bis 10 Minuten danach bietet das Popup auf demselben PR **Letztes Zurücksetzen rückgängig machen** an und schreibt die gelöschten Einträge zurück.
