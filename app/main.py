"""
SERVIDOR PRINCIPAL DO SISTEMA DE ANÁLISE VIBRACIONAL
Desenvolvido por: Marlon Biagi Parangaba
Email: eng.parangaba@gmail.com
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import threading
import time
import json
import logging
from datetime import datetime

from app.config import *
from app.serial_reader import SerialReader
from app.data_processor import DataProcessor, SystemConfig

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class VibrationSystemServer:
    """Servidor principal do sistema"""
    
    def __init__(self):
        # Inicializar Flask
        self.app = Flask(__name__, 
                        template_folder=TEMPLATES_DIR,
                        static_folder=STATIC_DIR)
        CORS(self.app)
        
        # Configurar SocketIO
        self.socketio = SocketIO(self.app, 
                                cors_allowed_origins="*",
                                async_mode='threading')
        
        # Componentes do sistema
        self.serial = SerialReader(baudrate=SERIAL_BAUD, timeout=SERIAL_TIMEOUT)
        self.processor = DataProcessor(SystemConfig(
            sample_rate=SAMPLE_RATE,
            fft_size=FFT_SIZE,  # Agora 2048
            buffer_size=BUFFER_SIZE,  # Agora 4096
            motor_frequency=DEFAULT_CONFIG['motor_frequency'],
            noise_threshold=DEFAULT_CONFIG['noise_threshold'],
            fft_range=DEFAULT_CONFIG['fft_range']
        ))
        
        # Estado do sistema
        self.running = False
        self.test_recording = False
        self.test_data = []
        self.clients_connected = 0
        self.system_start_time = time.time()
        self.last_test_save_time = 0.0
        
        # Configurar rotas e eventos
        self.setup_routes()
        self.setup_socketio_events()
        
        # Iniciar thread de processamento
        self.start_processing_thread()
        
        logger.info(f"Servidor inicializado com FFT_SIZE={FFT_SIZE}, BUFFER_SIZE={BUFFER_SIZE}")
        logger.info(f"Sistema desenvolvido por: Marlon Biagi Parangaba")
        logger.info(f"Email: eng.parangaba@gmail.com")
    
    def setup_routes(self):
        """Configurar rotas HTTP"""
        
        @self.app.route('/')
        def index():
            """Página principal"""
            return render_template('index.html')
        
        @self.app.route('/api/status')
        def api_status():
            """Status do sistema"""
            buffer_info = self.processor.get_buffer_info()
            status = {
                'connected': self.serial.is_connected(),
                'running': self.running,
                'test_recording': self.test_recording,
                'clients': self.clients_connected,
                'buffer': buffer_info['buffer_usage'],
                'total_samples': buffer_info['total_samples'],
                'collection_time': buffer_info['collection_time'],
                'system_uptime': time.time() - self.system_start_time,
                'config': DEFAULT_CONFIG
            }
            return jsonify(status)
        
        @self.app.route('/api/ports')
        def api_ports():
            """Lista portas seriais disponíveis"""
            ports = self.serial.list_ports()
            return jsonify(ports)
        
        @self.app.route('/api/connect', methods=['POST'])
        def api_connect():
            """Conectar à porta serial"""
            data = request.json
            port = data.get('port')
            
            if not port:
                return jsonify({'success': False, 'error': 'Porta não especificada'})
            
            try:
                success = self.serial.connect(port)
                if success:
                    self.running = True
                    return jsonify({'success': True, 'port': port})
                else:
                    return jsonify({'success': False, 'error': 'Falha na conexão'})
            except Exception as e:
                logger.error(f"Erro na conexão: {e}")
                return jsonify({'success': False, 'error': str(e)})
        
        @self.app.route('/api/disconnect')
        def api_disconnect():
            """Desconectar da porta serial"""
            self.serial.disconnect()
            self.running = False
            return jsonify({'success': True})
        
        @self.app.route('/api/calibrate')
        def api_calibrate():
            """Recalibrar sensores"""
            if self.serial.is_connected():
                self.serial.send_command('RECALIBRAR')
                return jsonify({'success': True})
            return jsonify({'success': False, 'error': 'Não conectado'})
        
        @self.app.route('/api/start_test', methods=['POST'])
        def api_start_test():
            """Iniciar gravação de teste"""
            self.test_recording = True
            self.test_data = []
            logger.info("Teste iniciado")
            return jsonify({'success': True})
        
        @self.app.route('/api/stop_test', methods=['POST'])
        def api_stop_test():
            """Parar gravação de teste"""
            self.test_recording = False
            logger.info("Teste finalizado")
            return jsonify({'success': True})
        
        @self.app.route('/api/export_test', methods=['POST'])
        def api_export_test():
            """Exportar dados do teste"""
            if not self.test_data:
                return jsonify({'success': False, 'error': 'Nenhum dado para exportar'})
            
            try:
                filename = f"teste_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
                filepath = os.path.join(TESTS_DIR, filename)
                
                # Salvar como CSV
                import csv
                with open(filepath, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.writer(f)
                    
                    # Cabeçalho detalhado
                    writer.writerow([
                        'timestamp', 'elapsed_ms', 'time_formatted',
                        'dominant_freq', 'peak_amplitude', 'imbalance',
                        'rms1_x', 'rms1_y', 'rms1_z',
                        'rms2_x', 'rms2_y', 'rms2_z',
                        'buffer_usage', 'noise_level'
                    ])
                    
                    # Dados
                    for row in self.test_data:
                        if len(row) >= 14:  # Verificar se tem dados suficientes
                            writer.writerow([
                                row[0],  # timestamp
                                row[1],  # elapsed_ms
                                row[2],  # time_formatted
                                row[3],  # dominant_freq
                                row[4],  # peak_amplitude
                                row[5],  # imbalance
                                row[6],  # rms1_x
                                row[7],  # rms1_y
                                row[8],  # rms1_z
                                row[9],  # rms2_x
                                row[10], # rms2_y
                                row[11], # rms2_z
                                row[12], # buffer_usage
                                row[13]  # noise_level
                            ])
                
                logger.info(f"Teste exportado: {filename} ({len(self.test_data)} pontos)")
                return jsonify({'success': True, 'filename': filename})
            except Exception as e:
                logger.error(f"Erro ao exportar teste: {e}")
                return jsonify({'success': False, 'error': str(e)})
        
        @self.app.route('/api/config', methods=['GET', 'POST'])
        def api_config():
            """Configurações do sistema"""
            if request.method == 'GET':
                return jsonify(DEFAULT_CONFIG)
            else:
                data = request.json
                for key, value in data.items():
                    if key in DEFAULT_CONFIG:
                        DEFAULT_CONFIG[key] = value
                
                # Atualizar processador
                self.processor.config.motor_frequency = DEFAULT_CONFIG['motor_frequency']
                self.processor.config.noise_threshold = DEFAULT_CONFIG['noise_threshold']
                self.processor.config.fft_range = DEFAULT_CONFIG['fft_range']
                
                logger.info(f"Configurações atualizadas: {DEFAULT_CONFIG}")
                return jsonify({'success': True})
        
        @self.app.route('/api/clear_data')
        def api_clear_data():
            """Limpar todos os dados"""
            self.processor.clear_data()
            self.test_data = []
            return jsonify({'success': True})
        
        @self.app.route('/static/<path:path>')
        def serve_static(path):
            """Servir arquivos estáticos"""
            return send_from_directory(STATIC_DIR, path)
        
        @self.app.route('/data/tests/<filename>')
        def serve_test_file(filename):
            """Servir arquivos de teste"""
            return send_from_directory(TESTS_DIR, filename, as_attachment=True)
    
    def setup_socketio_events(self):
        """Configurar eventos WebSocket"""
        
        @self.socketio.on('connect')
        def handle_connect():
            self.clients_connected += 1
            logger.info(f"Cliente conectado. Total: {self.clients_connected}")
            emit('connected', {'message': 'Conectado ao servidor'})
            
            # Enviar configuração atual
            emit('config_update', DEFAULT_CONFIG)
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            self.clients_connected = max(0, self.clients_connected - 1)
            logger.info(f"Cliente desconectado. Total: {self.clients_connected}")
        
        @self.socketio.on('get_config')
        def handle_get_config():
            emit('config_update', DEFAULT_CONFIG)
        
        @self.socketio.on('set_motor_freq')
        def handle_set_motor_freq(data):
            freq = data.get('frequency')
            if freq in RPM_FACTORS:
                DEFAULT_CONFIG['motor_frequency'] = freq
                self.processor.config.motor_frequency = freq
                emit('config_update', DEFAULT_CONFIG)
                logger.info(f"Frequência do motor alterada para {freq} Hz")
    
    def start_processing_thread(self):
        """Iniciar thread de processamento de dados"""
        def processing_loop():
            while True:
                try:
                    self.process_data()
                    time.sleep(0.01)  # 100Hz
                except Exception as e:
                    logger.error(f"Erro no processamento: {e}")
                    time.sleep(1)
        
        thread = threading.Thread(target=processing_loop, daemon=True)
        thread.start()
        logger.info("Thread de processamento iniciada")
    
    def process_data(self):
        """Processar dados recebidos do serial"""
        if not self.serial.is_connected() or not self.running:
            return
        
        # Coletar todos os dados disponíveis
        lines = self.serial.get_all_data()
        
        for line in lines:
            # Parse da linha
            parsed = self.serial.parse_data_line(line)
            
            if parsed:
                if parsed['type'] == 'data':
                    # Adicionar ao processador
                    self.processor.add_data(parsed)
                    
                    # Se gravando teste, salvar
                    if self.test_recording:
                        # Obter dados atuais
                        current_time = time.time()

                        # Salvar no máximo a cada 0,2 s (5 Hz)
                        if current_time - self.last_test_save_time >= 0.2:
                            update = self.processor.process_realtime_update()
                        
                            if update:
                                self.test_data.append([
                                    datetime.now().isoformat(),  # timestamp
                                    int((current_time - self.system_start_time) * 1000),  # elapsed_ms
                                    datetime.now().strftime('%H:%M:%S'),  # time_formatted
                                    update['peaks']['m1']['frequency'],
                                    update['peaks']['m1']['amplitude'],
                                    update['imbalance'],
                                    update['rms']['m1']['x'],
                                    update['rms']['m1']['y'],
                                    update['rms']['m1']['z'],
                                    update['rms']['m2']['x'],
                                    update['rms']['m2']['y'],
                                    update['rms']['m2']['z'],
                                    update['buffer_status'],
                                    update['current_noise']
                                ])
                                
                            self.last_test_save_time = current_time
                
                elif parsed['type'] == 'status':
                    # Enviar status para clientes
                    self.socketio.emit('status_message', {'message': parsed['message']})
        
        # Processar atualização em tempo real (se tiver clientes)
        if self.clients_connected > 0 and len(self.processor.data_buffer) >= 100:
            update = self.processor.process_realtime_update()
            if update:
                self.socketio.emit('data_update', update)
    
    def run(self, host='127.0.0.1', port=5000, debug=False):
        """Executar servidor"""
        logger.info(f"Servidor iniciando em http://{host}:{port}")
        
        try:
            self.socketio.run(self.app, host=host, port=port, debug=debug)
        except KeyboardInterrupt:
            logger.info("Servidor encerrado pelo usuário")
        except Exception as e:
            logger.error(f"Erro ao executar servidor: {e}")

if __name__ == '__main__':
    server = VibrationSystemServer()
    server.run(host=WEBSOCKET_CONFIG['host'], 
               port=WEBSOCKET_CONFIG['port'], 
               debug=WEBSOCKET_CONFIG['debug'])