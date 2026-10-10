$workspaceEmail = Read-Host 'Workspace sign-in email'
$workspacePassword = Read-Host 'Workspace password (at least 12 characters)' -AsSecureString
$workspacePointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($workspacePassword)
try {
    $workspacePlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($workspacePointer)
    @{ email = $workspaceEmail; password = $workspacePlain } | ConvertTo-Json -Compress | node scripts/configure-auth.mjs
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($workspacePointer)
    $workspacePlain = $null
}
