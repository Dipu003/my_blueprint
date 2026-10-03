<#
  Generates the announcer voice clips in public/voice/*.wav from src/data/voice-lines.json.

  Run from the project root (Windows only, uses the voices built into Windows):
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/generate-voice.ps1

  Run it again whenever you edit a line in voice-lines.json. The site plays these clips through a
  "radio comms" effect (see src/lib/sound.ts), so a plain studio-clean voice is what we want here.
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$linesFile = Join-Path $root 'src/data/voice-lines.json'
$outDir = Join-Path $root 'public/voice'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$lines = Get-Content $linesFile -Raw | ConvertFrom-Json

# Female voice preference: modern (OneCore/WinRT) Zira first, then the classic SAPI Zira.
$preferred = 'Zira'

# Short, crisp callout: lines are kept to three words or fewer in voice-lines.json. A slightly raised
# pitch keeps the voice clearly female and bright once it goes through the radio filter.
function New-Ssml([string]$text) {
  $sentences = $text -split '(?<=[.!?])\s+' | Where-Object { $_ }
  $body = ($sentences | ForEach-Object { [System.Security.SecurityElement]::Escape($_) }) -join '<break time="180ms"/>'
  return "<speak version=`"1.0`" xmlns=`"http://www.w3.org/2001/10/synthesis`" xml:lang=`"en-US`"><prosody rate=`"0.97`" pitch=`"+6%`">$body</prosody></speak>"
}

function Save-WithWinRT([string]$text, [string]$path) {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
  $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
      $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    })[0]
  function Await($op, $type) {
    $task = $asTask.MakeGenericMethod($type).Invoke($null, @($op))
    $null = $task.Wait(-1)
    return $task.Result
  }
  $synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
  $voice = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -like "*$preferred*" } | Select-Object -First 1
  if (-not $voice) { throw "No WinRT voice matching '$preferred'" }
  $synth.Voice = $voice
  $stream = Await ($synth.SynthesizeSsmlToStreamAsync((New-Ssml $text))) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $reader = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($stream)
  $file = [System.IO.File]::Create($path)
  try { $reader.CopyTo($file) } finally { $file.Dispose(); $reader.Dispose() }
  return $voice.DisplayName
}

function Save-WithSapi([string]$text, [string]$path) {
  Add-Type -AssemblyName System.Speech
  $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
  try {
    $s.SelectVoice('Microsoft Zira Desktop')
    $s.Rate = -1
    $s.SetOutputToWaveFile($path)
    $s.SpeakSsml((New-Ssml $text))
  } finally { $s.Dispose() }
  return 'Microsoft Zira Desktop (SAPI)'
}

foreach ($prop in $lines.PSObject.Properties) {
  $path = Join-Path $outDir ($prop.Name + '.wav')
  try {
    $used = Save-WithWinRT $prop.Value $path
  } catch {
    Write-Host "WinRT voice failed ($($_.Exception.Message)); falling back to SAPI"
    $used = Save-WithSapi $prop.Value $path
  }
  $kb = [math]::Round((Get-Item $path).Length / 1KB)
  Write-Host ("{0,-9} {1,4} KB  {2}  <- {3}" -f $prop.Name, $kb, $used, $prop.Value)
}
