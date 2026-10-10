<#
  Generates the voice clips in public/voice/*.wav (Windows only, uses the voices built into Windows).

  Run from the project root:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/generate-voice.ps1            # everything
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/generate-voice.ps1 -Only intro # just the intro

  Two sets of clips:
    announcer  src/data/voice-lines.json   the short "radio comms" line when a tab opens (female).
                                           The site plays these through a radio effect (src/lib/sound.ts),
                                           so a plain studio-clean voice is what we want here.
    intro      src/data/intro-lines.json   the character's welcome speech (male). Played clean, a little
                                           higher than recorded so it sounds younger (VOICE.rate in
                                           src/lib/voice.ts). Edit a line there, then run this again.
#>
param([ValidateSet('all', 'announcer', 'intro')][string]$Only = 'all')

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'public/voice'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

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

function Find-Voice([string[]]$prefer) {
  foreach ($name in $prefer) {
    $v = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -like "*$name*" } | Select-Object -First 1
    if ($v) { return $v }
  }
  return $null
}

# One SSML document per line. Sentences are separated by a short pause so a callout stays crisp.
function New-Ssml([string]$text, [string]$lang, [string]$rate, [string]$pitch, [int]$breakMs) {
  $sentences = $text -split '(?<=[.!?])\s+' | Where-Object { $_ }
  $body = ($sentences | ForEach-Object { [System.Security.SecurityElement]::Escape($_) }) -join "<break time=`"${breakMs}ms`"/>"
  return "<speak version=`"1.0`" xmlns=`"http://www.w3.org/2001/10/synthesis`" xml:lang=`"$lang`"><prosody rate=`"$rate`" pitch=`"$pitch`">$body</prosody></speak>"
}

function Save-WithWinRT($voice, [string]$text, [string]$path, [string]$rate, [string]$pitch, [int]$breakMs) {
  $synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
  $synth.Voice = $voice
  $ssml = New-Ssml $text $voice.Language $rate $pitch $breakMs
  $stream = Await ($synth.SynthesizeSsmlToStreamAsync($ssml)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $reader = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($stream)
  $file = [System.IO.File]::Create($path)
  try { $reader.CopyTo($file) } finally { $file.Dispose(); $reader.Dispose() }
}

function Save-WithSapi([string]$sapiVoice, [string]$text, [string]$path, [string]$rate, [string]$pitch, [int]$breakMs) {
  Add-Type -AssemblyName System.Speech
  $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
  try {
    $s.SelectVoice($sapiVoice)
    $s.Rate = -1
    $s.SetOutputToWaveFile($path)
    $s.SpeakSsml((New-Ssml $text 'en-US' $rate $pitch $breakMs))
  } finally { $s.Dispose() }
}

function Get-WavSeconds([string]$path) {
  $b = [System.IO.File]::ReadAllBytes($path)
  $rate = [BitConverter]::ToInt32($b, 24)
  $chan = [BitConverter]::ToInt16($b, 22)
  $bits = [BitConverter]::ToInt16($b, 34)
  return [math]::Round(($b.Length - 44) / ($rate * $chan * ($bits / 8)), 2)
}

# ---------------------------------------------------------------- announcer (female, radio comms)
if ($Only -in 'all', 'announcer') {
  $lines = Get-Content (Join-Path $root 'src/data/voice-lines.json') -Raw | ConvertFrom-Json
  # Lines are kept to three words or fewer. A slightly raised pitch keeps the voice clearly female and
  # bright once it goes through the radio filter.
  $voice = Find-Voice @('Zira')
  foreach ($prop in $lines.PSObject.Properties) {
    $path = Join-Path $outDir ($prop.Name + '.wav')
    try {
      if (-not $voice) { throw "No WinRT voice matching 'Zira'" }
      Save-WithWinRT $voice $prop.Value $path '0.97' '+6%' 180
      $used = $voice.DisplayName
    } catch {
      Write-Host "WinRT voice failed ($($_.Exception.Message)); falling back to SAPI"
      Save-WithSapi 'Microsoft Zira Desktop' $prop.Value $path '0.97' '+6%' 180
      $used = 'Microsoft Zira Desktop (SAPI)'
    }
    Write-Host ("{0,-9} {1,5}s  {2}  <- {3}" -f $prop.Name, (Get-WavSeconds $path), $used, $prop.Value)
  }
}

# ---------------------------------------------------------------- intro (male, the character's speech)
if ($Only -in 'all', 'intro') {
  $intro = Get-Content (Join-Path $root 'src/data/intro-lines.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  $voice = Find-Voice @($intro.voice.prefer)
  if (-not $voice) { throw "None of the intro voices are installed: $($intro.voice.prefer -join ', ')" }
  Write-Host "Intro voice: $($voice.DisplayName) ($($voice.Language))"
  foreach ($line in $intro.lines) {
    $path = Join-Path $outDir ($line.id + '.wav')
    Save-WithWinRT $voice $line.speech $path $intro.voice.rate $intro.voice.pitch 260
    Write-Host ("{0,-9} {1,5}s  <- {2}" -f $line.id, (Get-WavSeconds $path), $line.text)
  }
}
