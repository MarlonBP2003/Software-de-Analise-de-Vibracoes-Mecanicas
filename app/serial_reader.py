"""
LEITOR SERIAL PARA COMUNICAÇÃO COM ESP32
Desenvolvido por: Marlon Biagi Parangaba
Email: eng.parangaba@gmail.com
"""

import serial
import serial.tools.list_ports
import threading
import time
import queue
import logging
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)

class SerialReader:
    """Gerencia comunicação serial com ESP32"""
    
    def __init__(self, baudrate: int = 921600, timeout: int = 1):
        self.baudrate = baudrate
        self.timeout = timeout
        self.serial_conn: Optional[serial.Serial] = None
        self.running = False
        self.data_queue = queue.Queue()
        self.reader_thread: Optional[threading.Thread] = None
        self.bytes_received = 0
        self.start_time = time.time()
        
    def list_ports(self) -> List[str]:
        """Lista portas seriais disponíveis"""
        ports = [port.device for port in serial.tools.list_ports.comports()]
        logger.info(f"Portas seriais encontradas: {ports}")
        return ports
    
    def connect(self, port: str) -> bool:
        """Conecta à porta serial especificada"""
        try:
            if self.serial_conn and self.serial_conn.is_open:
                self.disconnect()
            
            logger.info(f"Tentando conectar na porta {port} com baudrate {self.baudrate}")
            self.serial_conn = serial.Serial(
                port=port,
                baudrate=self.baudrate,
                timeout=self.timeout
            )
            
            time.sleep(2)  # Aguardar conexão
            self.serial_conn.reset_input_buffer()
            
            # Iniciar thread de leitura
            self.running = True
            self.reader_thread = threading.Thread(target=self._read_loop)
            self.reader_thread.daemon = True
            self.reader_thread.start()
            
            logger.info(f"Conectado à porta serial: {port}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao conectar na porta {port}: {e}")
            return False
    
    def disconnect(self):
        """Desconecta da porta serial"""
        self.running = False
        if self.serial_conn and self.serial_conn.is_open:
            self.serial_conn.close()
            logger.info("Desconectado da porta serial")
    
    def send_command(self, command: str):
        """Envia comando para ESP32"""
        if self.serial_conn and self.serial_conn.is_open:
            try:
                self.serial_conn.write(f"{command}\n".encode())
                logger.info(f"Comando enviado: {command}")
            except Exception as e:
                logger.error(f"Erro ao enviar comando: {e}")
    
    def _read_loop(self):
        """Loop de leitura serial em thread separada"""
        while self.running and self.serial_conn and self.serial_conn.is_open:
            try:
                line = self.serial_conn.readline().decode('utf-8').strip()
                if line:
                    self.data_queue.put(line)
                    self.bytes_received += len(line)
            except UnicodeDecodeError:
                continue  # Ignorar linhas com decode inválido
            except Exception as e:
                logger.error(f"Erro na leitura serial: {e}")
                time.sleep(0.1)
    
    def get_data(self, timeout: float = 0.1) -> Optional[str]:
        """Obtém dados da fila (não-bloqueante)"""
        try:
            return self.data_queue.get(timeout=timeout)
        except queue.Empty:
            return None
    
    def get_all_data(self) -> List[str]:
        """Obtém todos os dados disponíveis na fila"""
        data = []
        while not self.data_queue.empty():
            try:
                data.append(self.data_queue.get_nowait())
            except queue.Empty:
                break
        
        # Log de performance ocasional
        if len(data) > 0 and time.time() - self.start_time > 10:
            data_rate = self.bytes_received / (time.time() - self.start_time)
            logger.debug(f"Taxa de dados: {data_rate:.2f} bytes/seg, {len(data)} linhas na fila")
            
        return data
    
    def is_connected(self) -> bool:
        """Verifica se está conectado"""
        return self.serial_conn is not None and self.serial_conn.is_open
    
    def parse_data_line(self, line: str) -> Optional[Dict]:
        """
        Parse de linha CSV do ESP32
        Formato: TIMESTAMP_MS,M1_X,M1_Y,M1_Z,M2_X,M2_Y,M2_Z
        """
        if line.startswith('#'):
            # Linha de comando/status
            return {'type': 'status', 'message': line[1:].strip()}
        
        parts = line.split(',')
        if len(parts) == 7:
            try:
                return {
                    'type': 'data',
                    'timestamp': int(parts[0]),
                    'm1': {
                        'x': float(parts[1]),
                        'y': float(parts[2]),
                        'z': float(parts[3])
                    },
                    'm2': {
                        'x': float(parts[4]),
                        'y': float(parts[5]),
                        'z': float(parts[6])
                    }
                }
            except (ValueError, IndexError) as e:
                logger.debug(f"Erro ao parsear linha: {line} - {e}")
                return None
        
        logger.debug(f"Formato inválido: {line}")
        return None