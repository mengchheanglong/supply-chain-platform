[CmdletBinding()]
param([ValidateSet('Integration','Load','Browser','InventoryLoad')] [string]$Mode = 'Integration')
$ErrorActionPreference = 'Stop'
$projectPath = Split-Path $PSScriptRoot -Parent
$testContainer = 'platform-test-' + [Guid]::NewGuid().ToString('N')
$testPassword = [Guid]::NewGuid().ToString('N')
$previousTestUrl = $env:TEST_DATABASE_URL
$previousAdminUrl = $env:TEST_ADMIN_URL
Push-Location $projectPath
try {
    & pnpm build
    if ($LASTEXITCODE -ne 0) { throw 'Platform build failed' }
    & docker run --rm -d --name $testContainer -p '127.0.0.1::5432' -e POSTGRES_DB=platform_test -e "POSTGRES_PASSWORD=$testPassword" postgis/postgis:18-3.6 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Isolated PostGIS container failed to start' }
    $ready = $false
    for ($attempt = 0; $attempt -lt 45; $attempt++) {
        & docker exec $testContainer pg_isready -U postgres -d platform_test 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $extensions = & docker exec $testContainer psql -U postgres -d platform_test -Atc "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname='postgis')" 2>$null
            if ($LASTEXITCODE -eq 0 -and "$extensions".Trim() -eq 't') { $ready = $true; break }
        }
        Start-Sleep -Seconds 1
    }
    if (!$ready) { throw 'PostGIS initialization did not finish' }
    # The password consists only of a generated GUID; no user-supplied SQL is interpolated.
    $testBootstrapSql = "CREATE ROLE sc_test_app LOGIN PASSWORD '$testPassword'; GRANT CONNECT ON DATABASE platform_test TO sc_test_app; GRANT USAGE,CREATE ON SCHEMA public TO sc_test_app;"
    $testBootstrapSql | & docker exec -i $testContainer psql -U postgres -d platform_test -v ON_ERROR_STOP=1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Test application role creation failed' }
    $binding = & docker port $testContainer 5432/tcp
    if ($binding -notmatch '^127\.0\.0\.1:(\d+)$') { throw 'Test database is not loopback-only' }
    $testPort = $Matches[1]
    $env:TEST_DATABASE_URL = 'postgresql://sc_test_app:' + $testPassword + '@127.0.0.1:' + $testPort + '/platform_test'
    $env:TEST_ADMIN_URL = 'postgresql://postgres:' + $testPassword + '@127.0.0.1:' + $testPort + '/platform_test'
    if ($Mode -eq 'InventoryLoad') { & node scripts/Inventory-Load.cjs }
    elseif ($Mode -eq 'Load') { & node scripts/Load-Baseline.cjs }
    elseif ($Mode -eq 'Browser') { & node scripts/Browser-QA.cjs }
    else { & node --test --test-concurrency=1 apps/api/tests/config.test.cjs apps/api/tests/master-data.integration.test.cjs apps/api/tests/inventory.integration.test.cjs apps/api/tests/fulfillment.integration.test.cjs apps/api/tests/exchange.integration.test.cjs apps/api/tests/snapshot.integration.test.cjs }
    if ($LASTEXITCODE -ne 0) { throw 'Platform integration tests failed' }
} finally {
    $env:TEST_DATABASE_URL = $previousTestUrl
    $env:TEST_ADMIN_URL = $previousAdminUrl
    & docker stop $testContainer 2>$null | Out-Null
    Pop-Location
}
