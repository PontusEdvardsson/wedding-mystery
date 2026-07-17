$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$errors = [System.Collections.Generic.List[string]]::new()
$sourceFiles = Get-ChildItem -Path $root -File | Where-Object {
  $_.Extension -in ".html", ".js", ".css", ".md"
}
$strictUtf8 = [System.Text.UTF8Encoding]::new($false, $true)

foreach ($file in $sourceFiles) {
  try {
    [void][System.IO.File]::ReadAllText($file.FullName, $strictUtf8)
  } catch {
    $errors.Add("Invalid UTF-8: $($file.Name)")
  }
}

$htmlFiles = Get-ChildItem -Path $root -File -Filter "*.html"
$cacheVersions = [System.Collections.Generic.HashSet[string]]::new()
$forbiddenMedia = '(?i)<\s*(audio|video)\b|\bnew\s+Audio\s*\(|\b(AudioContext|webkitAudioContext|speechSynthesis)\b'

foreach ($file in $htmlFiles) {
  $content = [System.IO.File]::ReadAllText($file.FullName, $strictUtf8)

  if ($content -notmatch 'Content-Security-Policy" content="media-src ''none''"') {
    $errors.Add("Missing media-src 'none': $($file.Name)")
  }

  foreach ($reference in [regex]::Matches($content, '(?:src|href)="([^"?]+\.(?:js|css))(?:\?[^"?]*)?"')) {
    $target = Join-Path $root $reference.Groups[1].Value
    if (-not (Test-Path -LiteralPath $target)) {
      $errors.Add("Missing referenced file in $($file.Name): $($reference.Groups[1].Value)")
    }
  }

  foreach ($version in [regex]::Matches($content, 'v=([0-9-]+)')) {
    [void]$cacheVersions.Add($version.Groups[1].Value)
  }

  if ($content -match $forbiddenMedia) {
    $errors.Add("Forbidden media API or element: $($file.Name)")
  }
}

foreach ($file in Get-ChildItem -Path $root -File -Filter "*.js") {
  $content = [System.IO.File]::ReadAllText($file.FullName, $strictUtf8)
  if ($content -match $forbiddenMedia) {
    $errors.Add("Forbidden media API or element: $($file.Name)")
  }
}

if ($cacheVersions.Count -ne 1) {
  $errors.Add("HTML files do not use one shared cache version.")
}

$config = [System.IO.File]::ReadAllText((Join-Path $root "mystery-config.js"), $strictUtf8)
$solutionMatch = [regex]::Match($config, 'solution: "([1-9]{81})"')

if (-not $solutionMatch.Success) {
  $errors.Add("Sudoku solution is missing or is not 81 digits.")
} else {
  $solution = $solutionMatch.Groups[1].Value
  $groups = @()

  for ($index = 0; $index -lt 9; $index += 1) {
    $groups += ,@(0..8 | ForEach-Object { $solution[$index * 9 + $_] })
    $groups += ,@(0..8 | ForEach-Object { $solution[$_ * 9 + $index] })
  }

  foreach ($boxRow in 0, 3, 6) {
    foreach ($boxColumn in 0, 3, 6) {
      $box = @()
      for ($row = 0; $row -lt 3; $row += 1) {
        for ($column = 0; $column -lt 3; $column += 1) {
          $box += $solution[(($boxRow + $row) * 9) + $boxColumn + $column]
        }
      }
      $groups += ,$box
    }
  }

  if ($groups.Where({ ($_ | Sort-Object -Unique).Count -ne 9 }).Count -gt 0) {
    $errors.Add("Sudoku solution has an invalid row, column or box.")
  }

  foreach ($given in [regex]::Matches($config, '\{ cell: (\d+), value: "([1-9])", clue:')) {
    $cell = [int]$given.Groups[1].Value
    if ($cell -ge 81 -or $solution[$cell].ToString() -ne $given.Groups[2].Value) {
      $errors.Add("Sudoku given does not match the solution at cell $cell.")
    }
  }
}

$connectionWords = [regex]::Matches($config, 'words: \[([^\]]+)\]') | ForEach-Object {
  [regex]::Matches($_.Groups[1].Value, '"([^"]+)"') | ForEach-Object {
    $_.Groups[1].Value
  }
}

if ($connectionWords.Count -ne 16 -or ($connectionWords | Sort-Object -Unique).Count -ne 16) {
  $errors.Add("Connections must contain 16 unique words.")
}

if ($config -match 'hintUnlockAt: "(?![^"\r\n]+(?:Z|[+-]\d{2}:\d{2})")') {
  $errors.Add("Every hint unlock time must include an explicit UTC offset.")
}

if ($errors.Count -gt 0) {
  $errors | ForEach-Object { Write-Error $_ }
  exit 1
}

Write-Output "Verification passed."
