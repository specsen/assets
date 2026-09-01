RHENUS V28.79 – VEGETATION 3D / PHOTO-VOLUME PACK
==================================================

Ziel
----
Eigenständiges Vegetationspaket für den Außenbereich der Warehouse-Szene.
Die bisher flachen Grünflächen können damit mit räumlichen Sträuchern,
Ziergräsern, Bodendeckern und einem optionalen realen Baum-GLB ergänzt werden.

Das Paket ist so aufgebaut, dass es direkt in den Root von
specsen/assets kopiert werden kann.

GitHub Runtime-Root
-------------------
https://raw.githubusercontent.com/specsen/assets/main

Enthaltene GLBs
---------------
models/environment/vegetation/shrub_photo_volume_a.glb
  - ca. 1.60 m breit / 1.40 m hoch
  - 4 gekreuzte Alpha-Ebenen
  - eingebettete PNG-Textur

models/environment/vegetation/shrub_photo_volume_b.glb
  - kleinere Variante
  - 4 gekreuzte Alpha-Ebenen
  - eingebettete PNG-Textur

models/environment/vegetation/ornamental_grass_photo_volume_a.glb
  - Ziergras / Beetgras, ca. 1.20 m hoch
  - 4 gekreuzte Alpha-Ebenen

models/environment/vegetation/ornamental_grass_photo_volume_b.glb
  - kleinere Variation

models/environment/vegetation/groundcover_photo_volume.glb
  - niedriger Bodendecker / Beetfüllung

models/environment/vegetation/small_deciduous_tree_photo_volume.glb
  - kleiner Laubbaum als leichtgewichtige Photo-Volume-Variante

models/environment/vegetation/trees_pine_realtime_lod2_v2872.glb
  - echtes Geometrie-GLB aus dem bestehenden V28.72 Real-Life-Pack
  - nur optional, da Nadelbäume nicht exakt dem aktuellen Referenzkonzept entsprechen

Wichtig zum Begriff "3D"
------------------------
Die Photo-Volume-Sträucher und Ziergräser sind keine flachen Kamera-Billboards.
Sie bestehen aus mehreren gekreuzten Ebenen im Raum und behalten dadurch beim
Vorbeilaufen Volumen und Parallaxe. Die Pflanzenfotos sind transparent in das
GLB eingebettet. Das ist ein bewährter Echtzeit-Ansatz für dichte Vegetation,
ohne dass jedes Blatt als Geometrie modelliert werden muss.

Die Pine-Trees-Datei enthält dagegen echte Baumgeometrie.

Texturen
--------
Die eingebetteten Texturen liegen zusätzlich separat unter:
textures/environment/vegetation/

Dadurch können sie später leicht ausgetauscht oder weiter optimiert werden.
Die GLBs selbst sind aber bereits vollständig und benötigen diese externen PNGs
nicht zum Laden.

Babylon.js
----------
Siehe js/vegetation_asset_loader.js.
Der Loader verwendet ausschließlich den eigenen GitHub-Asset-Root.

Performance
-----------
- GLB nur einmal als AssetContainer laden.
- Danach Instanzen/Clones erzeugen.
- Sträucher mit zufälliger Skalierung ca. 0.85–1.20 einsetzen.
- Rotation um Y zufällig variieren.
- Gräser eher in Gruppen von 3–8 Instanzen setzen.
- Nicht jedes einzelne Grasblatt modellieren.

Validierung
-----------
Alle enthaltenen GLBs wurden geprüft:
- GLB Magic = glTF
- glTF Version 2
- deklarierte Dateilänge korrekt
- erfolgreich mit trimesh wieder eingelesen

Direkter GitHub-Upload aus ChatGPT
----------------------------------
Die aktuelle GitHub-Verbindung besitzt momentan keine Schreibberechtigung für
specsen/assets (GitHub meldet 403). Daher ist dieses ZIP uploadfertig, wurde aber
nicht automatisch in das Repository geschrieben.
