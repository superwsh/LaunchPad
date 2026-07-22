@echo off
setlocal enabledelayedexpansion
REM usage:
REM   generate_update_data.bat [json_data] [server_url]
REM   generate_update_data.bat "{\"saleAddress\":\"0x...\",...}" localhost:30001

set "JSON1=%~1"
set "SERVER_URL=%~2"
if "%SERVER_URL%"=="" set "SERVER_URL=localhost:30001"

REM Use PowerShell to transform JSON: add id, rename tokenPriceInEth->tokenPriceInPT, convert timestamps to ms
for /f "delims=" %%i in ('powershell -NoProfile -Command "& { $obj = %JSON1% | ConvertFrom-Json; $obj | Add-Member -MemberType NoteProperty -Name 'id' -Value 3; $obj | Add-Member -MemberType NoteProperty -Name 'tokenPriceInPT' -Value $obj.tokenPriceInEth; $obj.PSObject.Properties.Remove('tokenPriceInEth'); $obj.saleEndTime = $obj.saleEndTime.ToString() + '000'; $obj.tokensUnlockTime = $obj.tokensUnlockTime.ToString() + '000'; $obj.registrationStart = $obj.registrationStart.ToString() + '000'; $obj.registrationEnd = $obj.registrationEnd.ToString() + '000'; $obj.saleStartTime = $obj.saleStartTime.ToString() + '000'; $obj | ConvertTo-Json -Compress }"') do set "JSON2=%%i"

echo SERVER_URL: %SERVER_URL%
echo request json: %JSON2%

curl -X POST http://%SERVER_URL%/boba/update -H "Content-Type: application/json" -d "%JSON2%"

endlocal
