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

Versehentlich zurückgesetzt? Bis 10 Minuten danach bietet das Popup auf demselben PR **Letztes Zurücksetzen rückgängig machen** an und schreibt die gelöschten Einträge zurück.
