@echo off
chcp 65001 >nul
title Sistema de Análise de Vibrações v2.0
cd /d "%~dp0"

echo.
echo ========================================
echo  SISTEMA DE ANÁLISE DE VIBRAÇÕES v2.0
echo  Desenvolvido por: Marlon Biagi Parangaba
echo  Email: eng.parangaba@gmail.com
echo ========================================
echo.

REM ========== VERIFICAÇÃO DO PYTHON ==========
echo 🔍 Verificando Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERRO: Python não encontrado!
    echo.
    echo 📌 Por favor, instale o Python 3.8 ou superior:
    echo 🌐 https://www.python.org/downloads/
    echo.
    echo 💡 Durante a instalação, MARQUE a opção:
    echo    [✓] Add Python to PATH
    echo.
    pause
    exit /b 1
)

REM Obter versão do Python
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo ✅ Python %PYTHON_VERSION% detectado
echo.

REM ========== VERIFICAÇÃO DE AMBIENTE VIRTUAL ==========
echo 🏗️  Configurando ambiente...
if not exist "venv" (
    echo 📦 Criando ambiente virtual Python...
    python -m venv venv
    if errorlevel 1 (
        echo ❌ Erro ao criar ambiente virtual
        echo 📌 Verifique se o módulo venv está disponível
        pause
        exit /b 1
    )
)

REM Ativar ambiente virtual
echo 📂 Ativando ambiente virtual...
call venv\Scripts\activate
if errorlevel 1 (
    echo ❌ Erro ao ativar ambiente virtual
    pause
    exit /b 1
)

REM ========== ATUALIZAÇÃO DO PIP ==========
echo 🔄 Atualizando pip...
python -m pip install --upgrade pip --quiet
if errorlevel 1 (
    echo ⚠️  Aviso: Não foi possível atualizar o pip
)

REM ========== INSTALAÇÃO DE DEPENDÊNCIAS ==========
echo 📦 Instalando/Verificando dependências...
echo.
if exist "requirements.txt" (
    echo 📋 Instalando do requirements.txt...
    pip install -r requirements.txt --quiet
    if errorlevel 1 (
        echo ⚠️  Tentando instalação manual...
        pip install flask flask-socketio flask-cors pyserial numpy scipy pandas eventlet --quiet
    )
) else (
    echo 📋 Instalando dependências manualmente...
    pip install flask flask-socketio flask-cors pyserial numpy scipy pandas eventlet --quiet
)

echo ✅ Dependências instaladas/verificadas
echo.

REM ========== CRIAÇÃO DE DIRETÓRIOS ==========
echo 📁 Criando estrutura de diretórios...
if not exist "data" mkdir data
if not exist "data\tests" mkdir data\tests
if not exist "data\calibrations" mkdir data\calibrations

REM ========== VERIFICAÇÃO DE ARQUIVOS ==========
echo 🔍 Verificando arquivos necessários...
if not exist "app\main.py" (
    echo ❌ ERRO: Arquivo app\main.py não encontrado!
    echo 📌 Certifique-se de que todos os arquivos estão no lugar correto
    pause
    exit /b 1
)

if not exist "templates\index.html" (
    echo ❌ ERRO: Arquivo templates\index.html não encontrado!
    pause
    exit /b 1
)

echo ✅ Todos os arquivos necessários encontrados
echo.

REM ========== INFORMAÇÕES DO SISTEMA ==========
echo 📊 INFORMAÇÕES DO SISTEMA:
echo    • FFT: 2048 pontos (Resolução: 0.0977 Hz/bin)
echo    • Buffer: 4096 amostras (≈20 segundos a 200Hz)
echo    • Sensores: 2x MPU6050 (I2C multiplexado)
echo    • Taxa: 200 Hz (5ms por amostra)
echo    • Comunicação: Serial 921600 baud
echo.

REM ========== INICIALIZAÇÃO DO SERVIDOR ==========
echo 🚀 INICIANDO SERVIDOR...
echo.
echo ========================================
echo  🌐 SISTEMA PRONTO PARA USO!
echo.
echo  📍 Endereço: http://localhost:5000
echo.
echo  🔌 Conectar o ESP32 via cabo USB
echo  🎯 Selecionar porta COM (geralmente COM3)
echo  🔗 Clicar em "Conectar"
echo.
echo  ⚠️  Para parar o servidor: CTRL+C
echo ========================================
echo.

REM ========== EXECUÇÃO DO SERVIDOR ==========
python app/main.py

REM ========== TRATAMENTO DE ERROS ==========
if errorlevel 1 (
    echo.
    echo ❌ ERRO AO INICIAR SERVIDOR
    echo.
    echo 🔧 Soluções possíveis:
    echo   1. Verifique se a porta 5000 está disponível
    echo   2. Execute como Administrador
    echo   3. Verifique as dependências: pip install -r requirements.txt
    echo   4. Verifique se o ESP32 está conectado
    echo.
    echo 📞 Suporte: eng.parangaba@gmail.com
    echo.
    pause
) else (
    echo.
    echo ✅ Servidor finalizado normalmente
)