# dev.ps1 - La Comadre Lola
# Sincroniza Drive -> local y arranca el servidor con auto-reload.
# Uso: powershell -ExecutionPolicy Bypass -File dev.ps1

$driveDir    = Split-Path -Parent $MyInvocation.MyCommand.Path
$driveRoot   = Split-Path -Parent $driveDir
$localDir    = "C:\dev\lola-backend"
$publicDir   = "$localDir\public"

function Write-Ok($msg)   { Write-Host " [OK] $msg" -ForegroundColor Green  }
function Write-Inf($msg)  { Write-Host " [..] $msg" -ForegroundColor Cyan   }
function Write-Warn($msg) { Write-Host " [!]  $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host " [ERR] $msg" -ForegroundColor Red   }

Clear-Host
Write-Host ""
Write-Host " La Comadre Lola - Dev Server" -ForegroundColor Magenta
Write-Host " ======================================" -ForegroundColor DarkGray
Write-Host " Backend : $localDir" -ForegroundColor DarkGray
Write-Host " Frontend: $publicDir" -ForegroundColor DarkGray
Write-Host " ======================================" -ForegroundColor DarkGray
Write-Host ""

# 1. Crear carpetas locales
foreach ($d in @($localDir, $publicDir)) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Path $d | Out-Null
        Write-Ok "Creada: $d"
    }
}

# 2. Sync backend (server.js, package.json, .env, etc.)
function Sync-Backend {
    robocopy $driveDir $localDir /MIR /XD node_modules .git /XF "*.bat" "*.ps1" /NP /NJH /NJS 2>&1 | Out-Null
    if ($LASTEXITCODE -le 7) { Write-Ok "Backend sincronizado" }
    else { Write-Err "Robocopy backend error $LASTEXITCODE" }
}

# 3. Sync frontend (index.html, editor_cms.html, js/)
function Sync-Frontend {
    robocopy $driveRoot $publicDir /MIR /XD backend .git node_modules /XF "*.md" "*.yaml" "*.bat" "*.ps1" /NP /NJH /NJS 2>&1 | Out-Null
    if ($LASTEXITCODE -le 7) { Write-Ok "Frontend sincronizado" }
    else { Write-Err "Robocopy frontend error $LASTEXITCODE" }
}

Write-Inf "Sincronizando backend..."
Sync-Backend
Write-Inf "Sincronizando frontend..."
Sync-Frontend

# 4. npm install si falta
if (-not (Test-Path "$localDir\node_modules")) {
    Write-Inf "Instalando dependencias npm..."
    Push-Location $localDir
    npm install --silent 2>&1 | Out-Null
    Pop-Location
    Write-Ok "Dependencias instaladas"
}

# 5. Iniciar servidor
$serverProcess = $null

function Start-Server {
    if ($script:serverProcess -and -not $script:serverProcess.HasExited) {
        $script:serverProcess.Kill()
        $script:serverProcess.WaitForExit(3000) | Out-Null
    }
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "node"
    $psi.Arguments = "server.js"
    $psi.WorkingDirectory = $localDir
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $script:serverProcess = [System.Diagnostics.Process]::Start($psi)
    Write-Ok "Servidor iniciado (PID $($script:serverProcess.Id))"
}

Start-Server
Start-Sleep -Seconds 2
Write-Host ""
Write-Host " Sitio : http://localhost:3001" -ForegroundColor Green
Write-Host " API   : http://localhost:3001/health" -ForegroundColor Green
Write-Host " Editor: http://localhost:3001/editor_cms.html" -ForegroundColor Cyan
Write-Host " Ctrl+C para detener" -ForegroundColor DarkGray
Write-Host ""

# 6. Watcher — backend y frontend raiz
$watcherB = New-Object System.IO.FileSystemWatcher
$watcherB.Path = $driveDir
$watcherB.IncludeSubdirectories = $false
$watcherB.NotifyFilter = [System.IO.NotifyFilters]::LastWrite -bor [System.IO.NotifyFilters]::FileName
$watcherB.EnableRaisingEvents = $true

$watcherF = New-Object System.IO.FileSystemWatcher
$watcherF.Path = $driveRoot
$watcherF.IncludeSubdirectories = $true
$watcherF.NotifyFilter = [System.IO.NotifyFilters]::LastWrite -bor [System.IO.NotifyFilters]::FileName
$watcherF.EnableRaisingEvents = $true

$lastSync = [datetime]::MinValue
Write-Inf "Vigilando cambios..."
Write-Host ""

function Handle-Change($name, $ext, $isBackend) {
    $skip = @('.bat', '.ps1', '.md', '.yaml', '')
    if ($name -eq 'package-lock.json' -or $ext -in $skip) { return }
    $now = [datetime]::Now
    if (($now - $script:lastSync).TotalSeconds -lt 1) { return }
    $script:lastSync = $now
    Write-Warn "Cambio: $name"
    Start-Sleep -Milliseconds 300
    if ($isBackend) {
        Sync-Backend
        if ($ext -eq '.js' -and $name -ne 'api.js') {
            Write-Inf "Reiniciando servidor..."
            Start-Server
        }
    } else {
        Sync-Frontend
    }
}

try {
    while ($true) {
        $chB = $watcherB.WaitForChanged([System.IO.WatcherChangeTypes]::All, 500)
        if (-not $chB.TimedOut) {
            $ext = [System.IO.Path]::GetExtension($chB.Name)
            Handle-Change $chB.Name $ext $true
        }
        $chF = $watcherF.WaitForChanged([System.IO.WatcherChangeTypes]::All, 500)
        if (-not $chF.TimedOut) {
            $ext = [System.IO.Path]::GetExtension($chF.Name)
            Handle-Change $chF.Name $ext $false
        }
    }
} finally {
    $watcherB.Dispose()
    $watcherF.Dispose()
    if ($script:serverProcess -and -not $script:serverProcess.HasExited) {
        $script:serverProcess.Kill()
    }
    Write-Host ""
    Write-Warn "Servidor detenido."
}
