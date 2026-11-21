RHENUS V34.710 – Helmut-Audio auf GitHub / Zoho nur Code
BASIS: Original V34.709; Grafik, 3D-Modelle, HUD, Physik und Tutoriallogik unverändert.

ZWEI ARCHIVE – ZWEI ZIELE:
1) RHENUS-V34.710-GITHUB-HELMUT-AUDIO-26-MP3.zip
   Inhalt: audio/ladungssicherung/ (26 MP3s) + Manifest + Anleitung.
   Alle Dateien und Unterordner unter Beibehaltung ihrer Ordnerstruktur ins
   GitHub-Repository specsen/assets auf Branch main legen.
   NICHT die ZIP-Datei als einzelnen Blob hochladen!
   Zielpfad zum Beispiel:
   https://raw.githubusercontent.com/specsen/assets/main/audio/ladungssicherung/welcome_de.mp3

2) RHENUS-V34.710-ZOHO-NUR-CODE-HELMUT-GITHUB-AUDIO.zip
   Inhalt: das vollständige Zoho-Widget, ohne eine einzige MP3-Datei.
   Diese ZIP wie bisher als Zoho Creator Widget hochladen.
   Einstiegsdatei: widget.html (im ZIP-Hauptverzeichnis).

WICHTIG: ERST GitHub-Dateien veröffentlichen, DANN Zoho-Widget installieren.
Die MP3s wurden lokal byteidentisch übernommen, die URLs jedoch nicht live
auf Abruf geprüft – bis zur Veröffentlichung können diese 404 liefern.

AUDIO: 4 bestehende Einleitungen (Willkommen, Beladen, Verzurren, Testfahrt)
+ 14 Beladen-HUD-Aufnahmen + 8 Verzurren-HUD-Aufnahmen = 26 MP3-Dateien.
Die Zehn Testfahrt-HUD-Texte haben noch keine eigene Sprachaufnahme.

GitHub-Pfadsteuerung (in app/asset-config.js):
  RHENUS_ASSET_ROOT = https://raw.githubusercontent.com/specsen/assets/main
  RHENUS_AUDIO_ASSET_ROOT = <ROOT>/audio/ladungssicherung/
Die 22 HUD-Audiodateien nutzen automatisch denselben Basis-Pfad.

Bei Audio-Ladefehlern greift der bisherige zeitgesteuerte HUD-Ablauf, die
Ausbildung bleibt benutzbar; die Stimme ist dann nicht hörbar.
CORS/Netzwerkzugriff auf raw.githubusercontent.com muss erlaubt sein.
Audio-Cache: im Bedarfsfall nach Änderungen Browsercache leeren.

Enthaltene Abgleichdateien: HELMUT_BELEGUNGSPLAN_V34.708.json und
HELMUT_BELEGUNGSPLAN_V34.709_VERZURREN.json. Die Zuordnung nach
ElevenLabs-Erstellungsreihenfolge ist weiterhin NICHT inhaltlich überprüft.

Tests: JS-Syntax, 26 Original-SHA-256, Url-Generierung, Wechsel/Abbruch/Fallback,
ZIP-Integrität, Vollständigkeit der Assets. Ein visueller Test in Zoho
Creator ist noch nicht erfolgt.
