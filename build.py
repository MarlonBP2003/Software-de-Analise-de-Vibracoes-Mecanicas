"""
SCRIPT DE BUILD PARA CRIAR EXECUTÁVEL
Desenvolvido por: Marlon Biagi Parangaba
Email: eng.parangaba@gmail.com
Data: Dezembro 2025
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

def create_directory_structure():
    """Cria estrutura de diretórios necessária"""
    directories = [
        'app',
        'static',
        'templates',
        'data/tests',
        'data/calibrations'
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"📁 Criado diretório: {directory}")

def install_dependencies():
    """Instala dependências do Python"""
    print("\n📦 Instalando dependências...")
    
    requirements = [
        'flask==2.3.3',
        'flask-socketio==5.3.4',
        'flask-cors==4.0.0',
        'pyserial==3.5',
        'numpy==1.24.3',
        'scipy==1.11.4',
        'pandas==2.0.3',
        'pyinstaller==5.13.0',
        'eventlet==0.33.3',
        'python-engineio==4.6.1',
        'python-socketio==5.9.0',
        'colorama==0.4.6',
        'python-dotenv==1.0.0'
    ]
    
    for package in requirements:
        print(f"  Instalando {package}...")
        subprocess.call([sys.executable, "-m", "pip", "install", package])

def create_requirements_file():
    """Cria arquivo requirements.txt"""
    print("\n📝 Criando requirements.txt...")
    
    requirements = """# Dependências do Sistema de Análise de Vibrações
# Desenvolvido por: Marlon Biagi Parangaba
# Email: eng.parangaba@gmail.com

# Framework web
flask==2.3.3
flask-socketio==5.3.4
flask-cors==4.0.0

# Comunicação serial
pyserial==3.5

# Processamento numérico
numpy==1.24.3
scipy==1.11.4
pandas==2.0.3

# WebSockets e eventos
eventlet==0.33.3
python-engineio==4.7.0
python-socketio==5.9.0

# Build e distribuição
pyinstaller==5.13.0

# Logging e utilitários
colorama==0.4.6
python-dotenv==1.0.0
"""
    
    with open('requirements.txt', 'w', encoding='utf-8') as f:
        f.write(requirements)

def create_start_batch():
    """Cria arquivo .bat para iniciar o sistema"""
    print("\n🔄 Criando start.bat...")
    
    batch_content = """@echo off
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

REM Verificar Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERRO: Python não encontrado!
    echo.
    echo Por favor, instale o Python 3.8 ou superior:
    echo https://www.python.org/downloads/
    echo.
    echo Durante a instalação, MARQUE a opção:
    echo    [✓] Add Python to PATH
    echo.
    pause
    exit /b 1
)

REM Ambiente virtual
if not exist "venv" (
    echo 📦 Criando ambiente virtual...
    python -m venv venv
)

call venv\Scripts\activate

REM Dependências
echo 📦 Instalando dependências...
pip install -r requirements.txt >nul 2>&1
if errorlevel 1 (
    pip install flask flask-socketio flask-cors pyserial numpy scipy pandas eventlet
)

REM Diretórios
if not exist "data\\tests" mkdir data\\tests
if not exist "data\\calibrations" mkdir data\\calibrations

REM Iniciar servidor
echo 🚀 Iniciando servidor...
echo 🌐 Acesse: http://localhost:5000
echo.

python app/main.py

if errorlevel 1 (
    echo ❌ Erro ao iniciar servidor.
    pause
)
"""
    
    with open('start.bat', 'w', encoding='utf-8') as f:
        f.write(batch_content)

def create_readme():
    """Cria arquivo README.txt"""
    print("\n📖 Criando README.txt...")
    
    readme_content = """========================================
SISTEMA DE ANÁLISE DE VIBRAÇÕES v2.0
========================================

DESENVOLVEDOR:
Marlon Biagi Parangaba
Email: eng.parangaba@gmail.com
Data: Dezembro 2025

CARACTERÍSTICAS:
- FFT 2048 pontos (0.0977 Hz/bin de resolução)
- 2 sensores MPU6050 via I2C multiplexado
- Taxa de amostragem: 200 Hz
- Buffer: 4096 amostras
- Análise em tempo real: FFT, RMS, harmônicos, desbalanceamento
- Exportação de dados em CSV
- Interface web moderna e responsiva

INSTALAÇÃO:
1. Execute start.bat
2. Aguarde a instalação das dependências
3. Acesse http://localhost:5000
4. Conecte o ESP32 e selecione a porta COM

ESTRUTURA:
vibration_system/
├── app/                    # Código Python
├── static/                # Frontend
├── templates/             # HTML
├── data/                  # Dados salvos
├── start.bat             # Inicialização
└── requirements.txt      # Dependências

SUPORTE:
Email: eng.parangaba@gmail.com

LICENÇA:
© 2025 Marlon Biagi Parangaba
Desenvolvido para fins acadêmicos e de pesquisa.
"""

    with open('README.txt', 'w', encoding='utf-8') as f:
        f.write(readme_content)

def build_executable():
    """Cria executável com PyInstaller"""
    print("\n🔨 Criando executável com PyInstaller...")
    
    # Limpar builds anteriores
    if os.path.exists('build'):
        shutil.rmtree('build')
    if os.path.exists('dist'):
        shutil.rmtree('dist')
    
    # Comando PyInstaller
    pyinstaller_cmd = [
        'pyinstaller',
        '--name=VibrationSystem',
        '--onefile',
        '--windowed',
        '--icon=favicon.ico',
        '--add-data=templates;templates',
        '--add-data=static;static',
        '--add-data=data;data',
        '--clean',
        'app/main.py'
    ]
    
    try:
        import PyInstaller.__main__
        PyInstaller.__main__.run(pyinstaller_cmd)
        
        # Mover executável para a raiz
        exe_src = 'dist/VibrationSystem.exe'
        if os.path.exists(exe_src):
            shutil.copy(exe_src, 'VibrationSystem.exe')
            print(f"\n✅ Executável criado: VibrationSystem.exe")
            print("📏 Tamanho:", os.path.getsize('VibrationSystem.exe') // 1024, "KB")
        else:
            print("❌ Executável não foi criado.")
            
    except Exception as e:
        print(f"❌ Erro ao criar executável: {e}")
        print("\n💡 Solução alternativa:")
        print("1. Instale o PyInstaller: pip install pyinstaller")
        print("2. Execute manualmente: pyinstaller --onefile --windowed app/main.py")

def create_favicon():
    """Cria favicon placeholder se não existir"""
    favicon_path = 'favicon.ico'
    if not os.path.exists(favicon_path):
        print("\n🎨 Criando favicon placeholder...")
        # Criar um ícone simples programaticamente
        try:
            from PIL import Image, ImageDraw
            img = Image.new('RGBA', (64, 64), (15, 52, 96, 255))
            draw = ImageDraw.Draw(img)
            draw.ellipse([16, 16, 48, 48], fill=(0, 180, 216, 255))
            draw.line([32, 20, 32, 44], fill=(255, 255, 255, 255), width=3)
            draw.line([20, 32, 44, 32], fill=(255, 255, 255, 255), width=3)
            img.save(favicon_path, format='ICO')
            print("✅ Favicon criado")
        except:
            # Se PIL não estiver disponível, criar arquivo vazio
            with open(favicon_path, 'wb') as f:
                pass

def main():
    """Função principal"""
    print("=" * 60)
    print(" CONSTRUÇÃO DO SISTEMA DE ANÁLISE DE VIBRAÇÕES")
    print(" Desenvolvido por: Marlon Biagi Parangaba")
    print(" Email: eng.parangaba@gmail.com")
    print("=" * 60)
    
    # Verificar argumentos
    build_exe = '--build-exe' in sys.argv
    
    # Criar estrutura
    create_directory_structure()
    
    # Criar arquivos auxiliares
    create_requirements_file()
    create_start_batch()
    create_readme()
    create_favicon()
    
    # Instalar dependências
    install_dependencies()
    
    # Criar executável se solicitado
    if build_exe:
        build_executable()
    
    print("\n" + "=" * 60)
    print("✅ CONSTRUÇÃO CONCLUÍDA COM SUCESSO!")
    print("\nPARA INICIAR O SISTEMA:")
    print("1. Execute start.bat")
    print("2. Acesse http://localhost:5000")
    print("3. Conecte o ESP32 e selecione a porta COM")
    print("\nPARA CRIAR EXECUTÁVEL:")
    print("Execute: python build.py --build-exe")
    print("=" * 60)

if __name__ == '__main__':
    main()