"""
CONFIGURAÇÃO DO SISTEMA DE ANÁLISE VIBRACIONAL
Desenvolvido por: Marlon Biagi Parangaba
Email: eng.parangaba@gmail.com
"""

import os

# Diretórios do projeto
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, 'static')
TEMPLATES_DIR = os.path.join(BASE_DIR, 'templates')
DATA_DIR = os.path.join(BASE_DIR, 'data')
TESTS_DIR = os.path.join(DATA_DIR, 'tests')
CALIBRATIONS_DIR = os.path.join(DATA_DIR, 'calibrations')

# Criar diretórios se não existirem
for directory in [DATA_DIR, TESTS_DIR, CALIBRATIONS_DIR]:
    os.makedirs(directory, exist_ok=True)

# Configurações do Sistema
SAMPLE_RATE = 200           # Hz
FFT_SIZE = 2048             # AUMENTADO para 2048 pontos (era 256)
BUFFER_SIZE = 4096          # Aumentado para suportar FFT maior (era 1000)
SERIAL_BAUD = 921600        # Baud rate serial
SERIAL_TIMEOUT = 1          # Timeout em segundos

# Fatores de conversão Hz para RPM (dados reais do motor)
RPM_FACTORS = {
    10: 28.3,      # 10Hz = 283 RPM
    20: 29.135,    # 20Hz = 582.7 RPM
    30: 29.34,     # 30Hz = 880.2 RPM
    40: 29.4,      # 40Hz = 1176 RPM
    50: 29.62,     # 50Hz = 1481 RPM
    60: 29.65      # 60Hz = 1779 RPM
}

# Configurações padrão
DEFAULT_CONFIG = {
    'motor_frequency': 20,      # Hz
    'noise_threshold': 50,      # mm/s²
    'fft_range': 100,           # Hz (aumentado para mostrar mais frequências, era 50)
    'main_axis': 'x',           # Eixo principal
    'buffer_warning': 70,       # % de warning do buffer
    'auto_backup': True         # Backup automático
}

# Cores da interface
COLORS = {
    'primary': '#0f3460',
    'secondary': '#1a1a2e',
    'accent': '#00b4d8',
    'success': '#00b894',
    'warning': '#fdcb6e',
    'danger': '#e94560',
    'sensor1': '#00b4d8',
    'sensor2': '#e94560'
}

# Configurações WebSocket
WEBSOCKET_CONFIG = {
    'host': '127.0.0.1',
    'port': 5000,
    'debug': False,
    'cors_allowed_origins': '*'
}