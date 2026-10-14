<#
  Instala SQL Server Express en silencio y lo deja listo para el POS (Principal).
  Lo ejecuta el instalador NSIS (installer.nsh) solo si no hay SQL Server.

  Pasos:
   1. Descarga el bootstrapper SSEI de SQL Server Express (MEDIATYPE Core).
   2. Instala la instancia SQLEXPRESS con autenticación mixta (SA) y TCP habilitado.
   3. Fija el puerto estático 1433 y abre el firewall.
   4. Reinicia el servicio.

  Parámetros:
   -SaPassword  Contraseña del usuario sa (debe coincidir con la que precarga el asistente).
   -Port        Puerto TCP (por defecto 1433).
   -SetupUrl    URL del SSEI de SQL Express (si Microsoft la cambia, actualízala).

  NOTA: requiere privilegios de administrador (el instalador NSIS corre perMachine).
  Este script debe probarse en Windows.
#>
param(
  [string]$SaPassword = "Ada369`$ecure1",
  [int]$Port = 1433,
  [string]$InstanceName = "SQLEXPRESS",
  [string]$SetupUrl = "https://go.microsoft.com/fwlink/p/?linkid=2216019" # SQL Server 2022 Express (SSEI)
)

$ErrorActionPreference = "Stop"
$log = Join-Path $env:TEMP "pse-sqlexpress-install.log"
function Log($m) { "$([DateTime]::Now.ToString('s'))  $m" | Tee-Object -FilePath $log -Append }

try {
  Log "Iniciando instalación de SQL Server Express ($InstanceName)."

  $work = Join-Path $env:TEMP "pse-sql"
  New-Item -ItemType Directory -Force -Path $work | Out-Null
  $ssei = Join-Path $work "SSEI-Expr.exe"

  Log "Descargando bootstrapper desde $SetupUrl"
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -Uri $SetupUrl -OutFile $ssei -UseBasicParsing

  # 1) Descargar el medio completo de instalación.
  $media = Join-Path $work "media"
  New-Item -ItemType Directory -Force -Path $media | Out-Null
  Log "Descargando medios de instalación…"
  Start-Process -FilePath $ssei -ArgumentList @(
    "/Action=Download", "/MediaPath=$media", "/MediaType=Core", "/Quiet"
  ) -Wait

  # El medio descargado es un .exe autoextraíble; lo extraemos.
  $pkg = Get-ChildItem -Path $media -Filter "SQLEXPR*.exe" | Select-Object -First 1
  if (-not $pkg) { throw "No se encontró el paquete SQLEXPR descargado." }
  $extract = Join-Path $work "setup"
  Log "Extrayendo $($pkg.Name)…"
  Start-Process -FilePath $pkg.FullName -ArgumentList @("/Q", "/X:$extract") -Wait
  $setup = Join-Path $extract "setup.exe"
  if (-not (Test-Path $setup)) { throw "No se encontró setup.exe tras extraer." }

  # 2) Instalar la instancia en silencio con autenticación mixta y TCP.
  Log "Instalando instancia $InstanceName…"
  Start-Process -FilePath $setup -ArgumentList @(
    "/Q", "/ACTION=Install", "/IACCEPTSQLSERVERLICENSETERMS",
    "/FEATURES=SQLEngine", "/INSTANCENAME=$InstanceName",
    "/SECURITYMODE=SQL", "/SAPWD=`"$SaPassword`"",
    "/SQLSYSADMINACCOUNTS=BUILTIN\Administrators",
    "/TCPENABLED=1", "/NPENABLED=0", "/UPDATEENABLED=0"
  ) -Wait

  # 3) Puerto estático 1433 (SQL Express usa puertos dinámicos por defecto).
  $base = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server"
  $inst = (Get-ItemProperty "$base\Instance Names\SQL").$InstanceName
  $tcpAll = "$base\$inst\MSSQLServer\SuperSocketNetLib\Tcp\IPAll"
  Log "Fijando puerto estático $Port en $tcpAll"
  Set-ItemProperty -Path $tcpAll -Name "TcpDynamicPorts" -Value ""
  Set-ItemProperty -Path $tcpAll -Name "TcpPort" -Value "$Port"

  # 4) Firewall + reinicio del servicio.
  $svc = "MSSQL`$$InstanceName"
  Log "Abriendo firewall y reiniciando $svc"
  netsh advfirewall firewall add rule name="SQL Server ($InstanceName)" dir=in action=allow protocol=TCP localport=$Port | Out-Null
  Set-Service -Name "SQLBrowser" -StartupType Automatic -ErrorAction SilentlyContinue
  Start-Service -Name "SQLBrowser" -ErrorAction SilentlyContinue
  Restart-Service -Name $svc -Force

  Log "SQL Server Express instalado y configurado (puerto $Port)."
  exit 0
}
catch {
  Log "ERROR: $($_.Exception.Message)"
  exit 1
}
