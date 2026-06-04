param(
  [string]$Root,
  [int]$Port = 4173
)

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), $Port)
$listener.Start()

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".js" = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png" = "image/png"
  ".jpg" = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".svg" = "image/svg+xml"
}

function Send-Response {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$Status,
    [string]$ContentType,
    [byte[]]$Body
  )

  $reason = if ($Status -eq 200) { "OK" } else { "Not Found" }
  $header = "HTTP/1.1 $Status $reason`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nConnection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  $Stream.Write($Body, 0, $Body.Length)
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    $stream = $client.GetStream()
    $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
    $requestLine = $reader.ReadLine()

    if (-not $requestLine) {
      $client.Close()
      continue
    }

    $parts = $requestLine.Split(" ")
    $requestPath = if ($parts.Length -ge 2) { $parts[1].Split("?")[0].TrimStart("/") } else { "" }
    $requestPath = [Uri]::UnescapeDataString($requestPath)
    if ([string]::IsNullOrWhiteSpace($requestPath)) {
      $requestPath = "index.html"
    }

    while ($reader.ReadLine()) {}

    $rootPath = [System.IO.Path]::GetFullPath($Root)
    $filePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($rootPath, $requestPath))

    if (-not $filePath.StartsWith($rootPath) -or -not [System.IO.File]::Exists($filePath)) {
      Send-Response -Stream $stream -Status 404 -ContentType "text/plain; charset=utf-8" -Body ([System.Text.Encoding]::UTF8.GetBytes("Not found"))
      $client.Close()
      continue
    }

    $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
    $contentType = if ($mime.ContainsKey($extension)) { $mime[$extension] } else { "application/octet-stream" }
    Send-Response -Stream $stream -Status 200 -ContentType $contentType -Body ([System.IO.File]::ReadAllBytes($filePath))
    $client.Close()
  }
}
finally {
  $listener.Stop()
}
