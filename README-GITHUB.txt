RHENUS V34.163 — MODERNER WERKSHOF MIT ECHTEN 3D-DETAILS

Die Ordner models/ und textures/ mit ihrer Ordnerstruktur in das vorhandene
specsen/assets Repository auf Branch main kopieren. Dann erst das Widget
RHENUS-ZOHO-V34.163-WERKSHOF-3D.zip in Zoho importieren.

7 eigenständige GLBs liegen unter models/environment/rhenus-yard/v34163/.
Architektur-PNGs und Materialkarten liegen unter
textures/environment/rhenus-yard/v34163/.

Der Betonboden ist in yard_floor.glb enthalten. Die Fotokulisse enthält keinen
sichtbaren Betonvordergrund und keine nahen Gestelle/Poller/Hoflampen mehr.
PBR-Texturen sind in den jeweiligen GLBs eingebettet. Meter, Y nach oben.
Die Haupt-PNG ist auf 3840 × 1982 hochskaliert; das Seitenbild hat 2172 × 724.

placement-layout.json dokumentiert die eingebauten lokalen Platzierungen.
Zum Ändern die layout-Tabelle in yard-props.js im Widget bearbeiten; die JSON
wird nur als Dokumentation mitgeliefert und nicht zusätzlich zur Laufzeit geladen.

tools/build-assets.js ist ein optionaler Generator (Node.js + @napi-rs/canvas).
Die fertigen GLBs benötigen ihn nicht. asset-validation.json und
scene-validation.json dokumentieren die technischen Prüfungen.
Ein sichtbarer Zoho-/WebGPU-Test und eine FPS-Messung stehen noch aus.

Vollständige Anleitung samt kopierbarem Projektprompt:
RHENUS-Werkshof-Umsetzung-V34.163.txt im Paket.
