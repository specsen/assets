$ErrorActionPreference = "Stop"
$base = Join-Path $PSScriptRoot "models\environment\vegetation\polyhaven"
$dir = Join-Path $base "tree_small_02"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/CBaileyDev/Life-Theory/9a2e1d51f9eb30e993bed73013eab57acfa34189/assets/models/tree_small_02.glb" -OutFile (Join-Path $dir "polyhaven_tree_small_02.glb")
$dir = Join-Path $base "fir_tree_01"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/CBaileyDev/Life-Theory/9a2e1d51f9eb30e993bed73013eab57acfa34189/assets/models/fir_tree_01.glb" -OutFile (Join-Path $dir "polyhaven_fir_tree_01.glb")
$dir = Join-Path $base "pine_tree_01"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/CBaileyDev/Life-Theory/9a2e1d51f9eb30e993bed73013eab57acfa34189/assets/models/pine_tree_01.glb" -OutFile (Join-Path $dir "polyhaven_pine_tree_01.glb")
$dir = Join-Path $base "shrub_01"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/CBaileyDev/Life-Theory/9a2e1d51f9eb30e993bed73013eab57acfa34189/assets/models/shrub_01.glb" -OutFile (Join-Path $dir "polyhaven_shrub_01.glb")
$dir = Join-Path $base "fern_02"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/CBaileyDev/Life-Theory/9a2e1d51f9eb30e993bed73013eab57acfa34189/assets/models/fern_02.glb" -OutFile (Join-Path $dir "polyhaven_fern_02.glb")
$dir = Join-Path $base "grass_medium_01"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/CBaileyDev/Life-Theory/9a2e1d51f9eb30e993bed73013eab57acfa34189/assets/models/grass_medium_01.glb" -OutFile (Join-Path $dir "polyhaven_grass_medium_01.glb")
Write-Host "Poly Haven mirror assets downloaded successfully."