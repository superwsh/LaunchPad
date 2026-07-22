@echo off
setlocal enabledelayedexpansion

if "%1"=="" (
    echo Usage: make.bat [target]
    echo Available targets: farm, ido
    exit /b 1
)

if "%1"=="farm" goto :farm
if "%1"=="ido" goto :ido

echo Unknown target: %1
echo Available targets: farm, ido
exit /b 1

:farm
    call npx hardhat compile
    if %errorlevel% neq 0 exit /b %errorlevel%
    call npx hardhat run --network local scripts/deployment/deploy_c2n_token.js
    if %errorlevel% neq 0 exit /b %errorlevel%
    call npx hardhat run --network local scripts/deployment/deploy_airdrop_c2n.js
    if %errorlevel% neq 0 exit /b %errorlevel%
    call npx hardhat run --network local scripts/deployment/deploy_farm.js
    if %errorlevel% neq 0 exit /b %errorlevel%
    goto :eof

:ido
    call npx hardhat compile
    if %errorlevel% neq 0 exit /b %errorlevel%
    call npx hardhat run --network local scripts/deployment/deploy_ido_all.js
    if %errorlevel% neq 0 exit /b %errorlevel%
    goto :eof
