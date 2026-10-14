; Personalización del instalador NSIS de PSE Caja.
; Si el equipo no tiene SQL Server, descarga e instala SQL Server Express
; (via build/install-sqlexpress.ps1). Solo aplica en el equipo Principal;
; las cajas Secundarias no necesitan SQL local (el asistente lo omite).
;
; La contraseña de 'sa' que fija el instalador DEBE coincidir con la que
; precarga el asistente de primera ejecución (SetupWizard).

!macro customInstall
  SetRegView 64
  ClearErrors
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Microsoft SQL Server" "InstalledInstances"
  ${If} $0 == ""
    DetailPrint "No se detectó SQL Server. Instalando SQL Server Express (puede tardar varios minutos)…"
    InitPluginsDir
    File "/oname=$PLUGINSDIR\install-sqlexpress.ps1" "${BUILD_RESOURCES_DIR}\install-sqlexpress.ps1"
    nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -File "$PLUGINSDIR\install-sqlexpress.ps1" -SaPassword "Ada369$$ecure1"'
    Pop $1
    ${If} $1 != 0
      MessageBox MB_OK|MB_ICONEXCLAMATION "No se pudo instalar SQL Server Express automáticamente.$\r$\nRevisa %TEMP%\pse-sqlexpress-install.log.$\r$\nPodrás indicar los datos de SQL manualmente en el asistente."
    ${EndIf}
  ${Else}
    DetailPrint "SQL Server ya está instalado: $0"
  ${EndIf}
!macroend
