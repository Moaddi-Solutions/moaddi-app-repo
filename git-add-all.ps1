# Stage all workspace files in the root repo without nested .git metadata.
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$Projects = @('moaddi-next', 'moaddi-server', 'vending_app')
$Hidden = @()

function Hide-NestedGit {
    foreach ($project in $Projects) {
        $gitPath = Join-Path $project '.git'
        $localPath = Join-Path $project '.git.local'
        if (Test-Path $gitPath) {
            Move-Item -Path $gitPath -Destination $localPath
            $script:Hidden += $project
        }
    }
}

function Restore-NestedGit {
    foreach ($project in $Hidden) {
        $gitPath = Join-Path $project '.git'
        $localPath = Join-Path $project '.git.local'
        if (Test-Path $localPath) {
            Move-Item -Path $localPath -Destination $gitPath
        }
    }
}

try {
    Hide-NestedGit
    if ($args.Count -gt 0) {
        git add @args
    } else {
        git add .
    }
    Write-Host 'Staged. Nested project .git folders were not added.'
} finally {
    Restore-NestedGit
}
