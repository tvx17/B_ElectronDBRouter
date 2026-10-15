[CmdletBinding()]
param(
  [string]$SessionId = '01a13ec2-3460-7950-86bd-47ef785921a7'
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  throw 'Codex CLI wurde nicht gefunden. Stelle sicher, dass codex im PATH liegt.'
}

Push-Location -LiteralPath $PSScriptRoot
try {
  & codex resume $SessionId --cd $PSScriptRoot
  if ($LASTEXITCODE -ne 0) {
    throw "Codex wurde mit Exitcode $LASTEXITCODE beendet."
  }
}
finally {
  Pop-Location
}
