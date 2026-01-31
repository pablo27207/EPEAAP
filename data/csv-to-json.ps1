# Script para convertir tablita.csv a epea_Data.json
# Con estructura de barcos que incluye tipo individual por cada barco

$csvPath = Join-Path $PSScriptRoot "tablita.csv"
$jsonPath = Join-Path $PSScriptRoot "epea_Data.json"
$templatePath = Join-Path $PSScriptRoot "epea_Data.json"

# Leer el JSON existente para mantener config y metadata
$existingJson = Get-Content $templatePath -Raw | ConvertFrom-Json

# Leer el CSV
$csv = Import-Csv $csvPath -Delimiter ";"

# Construir las campañas
$campañas = @()

foreach ($row in $csv) {
    $year = [int]$row.Year
    $month = $row.Month
    
    # Determinar nro_visitas
    $nroVisitas = if ($row.Nro_visitas -eq "NA") { $null } else { $row.Nro_visitas }
    
    # Determinar tipo general
    $tipo = if ($row.Tipo_visita -eq "NA") { "NA" } else { $row.Tipo_visita }
    
    # Procesar barcos con sus tipos individuales
    $barcosArray = @()
    
    if ($row.Barco -ne "NA" -and $row.Barco -ne "") {
        $barcosCodes = $row.Barco -split "-"
        $tiposVisita = $row.Tipo_visita -split "_"
        
        for ($i = 0; $i -lt $barcosCodes.Length; $i++) {
            $barcoCode = $barcosCodes[$i].Trim()
            
            # Determinar el tipo individual para este barco
            # Si hay múltiples tipos separados por _, usar el correspondiente por posición
            # Si hay un solo tipo, todos los barcos tienen ese tipo
            $tipoIndividual = if ($tiposVisita.Length -eq 1) {
                $tiposVisita[0]
            } elseif ($i -lt $tiposVisita.Length) {
                $tiposVisita[$i]
            } else {
                $tiposVisita[-1]  # Usar el último si no hay suficientes
            }
            
            $barcosArray += @{
                code = $barcoCode
                tipo = $tipoIndividual
            }
        }
    }
    
    # Procesar variables
    $variables = @()
    $varColumns = @("Temp", "Sal", "NTS", "OD", "pH", "AT", "Cla", "ABSO", "CDOM", "PP", "BACT", "FITO", "ZOO", "ICTIO")
    
    foreach ($var in $varColumns) {
        $value = $row.$var
        if ($value -ne "NA" -and $value -ne "" -and $null -ne $value) {
            $variables += $value
        }
    }
    
    $campaña = [ordered]@{
        year = $year
        month = $month
        nro_visitas = $nroVisitas
        tipo = $tipo
        barcos = $barcosArray
        variables = $variables
    }
    
    $campañas += $campaña
}

# Actualizar yearRange en metadata
$years = $campañas | ForEach-Object { $_.year } | Sort-Object -Unique
$minYear = $years | Select-Object -First 1
$maxYear = $years | Select-Object -Last 1

$existingJson.metadata.yearRange = @($minYear, $maxYear)
$existingJson.metadata.lastUpdated = (Get-Date).ToString("yyyy-MM-dd")

# Reemplazar campañas
$existingJson.campañas = $campañas

# Convertir a JSON y guardar
$jsonOutput = $existingJson | ConvertTo-Json -Depth 10

# Guardar
$jsonOutput | Set-Content $jsonPath -Encoding UTF8

Write-Host "✅ Conversión completada!"
Write-Host "   - Campañas procesadas: $($campañas.Count)"
Write-Host "   - Rango de años: $minYear - $maxYear"
Write-Host "   - Archivo guardado: $jsonPath"
