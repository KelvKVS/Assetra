#Requires -Version 5.1
<#
.SYNOPSIS
  Gera ZIP com o código-fonte do Assetra para anexar ao relatório (Apêndice 8 / DDE).

.DESCRIPTION
  Usa tar (incluído no Windows 10+) para criar um .zip com exclusões explícitas.
  Executar na raiz do repositório:
    pwsh -File docs/scripts/compactar-codigo-fonte-appendix.ps1

.NOTES
  Exclui: node_modules, .git, dist, backend/uploads, backend/.env
#>
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$outName = "Assetra-codigo-fonte-$stamp.zip"
# Gravar fora da pasta do projeto para o tar não tentar incluir o próprio arquivo.
$outPath = Join-Path (Split-Path $root -Parent) $outName

if (Test-Path $outPath) { Remove-Item $outPath -Force }

Push-Location $root
try {
  & tar.exe -a -c -f $outPath `
    --exclude=node_modules `
    --exclude=.git `
    --exclude=dist `
    --exclude=backend/node_modules `
    --exclude=backend/uploads `
    --exclude=backend/.env `
    --exclude=.qwen `
    .
  if ($LASTEXITCODE -ne 0) { throw "tar terminou com código $LASTEXITCODE" }
}
finally {
  Pop-Location
}

Write-Host "Criado: $outPath"
