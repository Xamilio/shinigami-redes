$files = @(
    "g:/shinigami-redes/index.html",
    "g:/shinigami-redes/style.css",
    "g:/shinigami-redes/main.js",
    "g:/shinigami-redes/admin.js",
    "g:/shinigami-redes/admin.css",
    "g:/shinigami-redes/supabase-config.js",
    "g:/shinigami-redes/auth.js",
    "g:/shinigami-redes/i18n.js",
    "g:/shinigami-redes/product/index.html",
    "g:/shinigami-redes/product.css",
    "g:/shinigami-redes/profile/index.html",
    "g:/shinigami-redes/profile/profile.js",
    "g:/shinigami-redes/login.html"
)

foreach ($f in $files) {
    if (Test-Path $f) {
        $content = [System.IO.File]::ReadAllText($f)
        
        # Resolve merge conflicts
        $pattern = '(?ms)^<<<<<<< HEAD\r?\n(.*?)\r?\n=======\r?\n(.*?)\r?\n>>>>>>> [0-9a-f]+'
        $newContent = [regex]::Replace($content, $pattern, {
            param($match)
            $s1 = $match.Groups[1].Value
            $s2 = $match.Groups[2].Value
            if ($s2.Trim().Length -gt 0) { return $s2 }
            return $s1
        })
        
        # Remove console.log
        $newContent = $newContent -replace 'console\.log\(.*?\);?', ''
        
        # Remove empty lines resulting from resolution
        $newContent = $newContent -replace '(\r?\n\s*){3,}', "`n`n"
        
        [System.IO.File]::WriteAllText($f, $newContent)
        Write-Host "Cleaned: $f"
    }
}

$rootLogin = "g:/shinigami-redes/login.html"
if (Test-Path $rootLogin) {
    Remove-Item $rootLogin
    Write-Host "Deleted redundant: $rootLogin"
}
