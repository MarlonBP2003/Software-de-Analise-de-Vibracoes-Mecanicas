"""
PROCESSAMENTO DE DADOS VIBRACIONAIS
Desenvolvido por: Marlon Biagi Parangaba
Email: eng.parangaba@gmail.com
"""

import numpy as np
from scipy import signal
import logging
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import json
import time

logger = logging.getLogger(__name__)

@dataclass
class SystemConfig:
    """Configuração do sistema de processamento"""
    sample_rate: int = 200
    fft_size: int = 2048  # Aumentado de 256 para 2048
    buffer_size: int = 4096  # Aumentado de 1000 para 4096
    motor_frequency: int = 20
    noise_threshold: float = 50.0
    fft_range: int = 100  # Aumentado de 50 para 100

class DataProcessor:
    """Processa dados vibracionais (FFT, RMS, harmônicos, etc.)"""
    
    def __init__(self, config: SystemConfig):
        self.config = config
        self.data_buffer: List[Dict] = []
        self.fft_cache = {}
        self.start_time = time.time()
        self.total_samples = 0
        self.avg_interval = None
        self.last_timestamp = None
        
        # Resolução de frequência (melhor resolução com FFT maior)
        self.freq_resolution = config.sample_rate / config.fft_size
        
        # Fatores RPM (dados reais do motor)
        self.rpm_factors = {
            10: 28.3, 20: 29.135, 30: 29.34,
            40: 29.4, 50: 29.62, 60: 29.65
        }
        
        logger.info(f"Inicializado DataProcessor com FFT_SIZE={config.fft_size}, resolução={self.freq_resolution:.4f} Hz/bin")
    
    def add_data(self, data_point: Dict):
        """Adiciona ponto de dados ao buffer"""
        self.data_buffer.append(data_point)
        self.total_samples += 1

        ts = data_point['timestamp']  # timestamp do ESP32 em ms

        if self.last_timestamp is not None:
            interval = ts - self.last_timestamp  # intervalo entre pacotes

            if self.avg_interval is None:
                self.avg_interval = interval

            else:
                # filtro exponencial (suavização)
                self.avg_interval = self.avg_interval * 0.9 + interval * 0.1

        self.last_timestamp = ts
        
        # Manter tamanho do buffer
        if len(self.data_buffer) > self.config.buffer_size:
            self.data_buffer = self.data_buffer[-self.config.buffer_size:]
    
    def calculate_fft(self, sensor_data: List[float], axis: str = 'x') -> np.ndarray:
        """Calcula FFT de um sinal com filtro para remover pico de 0 Hz"""
        if len(sensor_data) < self.config.fft_size:
            return np.zeros(self.config.fft_size // 2)
        
        # Pegar últimas N amostras
        signal_data = sensor_data[-self.config.fft_size:]
        
        # Remover média DC (evita pico em 0 Hz)
        signal_data = signal_data - np.mean(signal_data)
        
        # Aplicar janela de Hann (reduz vazamento espectral)
        window = np.hanning(len(signal_data))
        windowed_signal = signal_data * window
        
        # Calcular FFT
        fft_result = np.fft.fft(windowed_signal)
        
        # Calcular magnitude (apenas metade simétrica)
        magnitude = np.abs(fft_result[:self.config.fft_size // 2])
        
        # Normalizar
        magnitude = magnitude / (self.config.fft_size / 2)
        
        # Remover componente DC (0 Hz) para evitar pico de 0.0
        if len(magnitude) > 0:
            magnitude[0] = 0
        
        # Aplicar threshold suave
        magnitude[magnitude < (self.config.noise_threshold / 20)] = 0
        
        return magnitude
    
    def extract_signal(self, sensor: str = 'm1', axis: str = 'x') -> List[float]:
        """Extrai sinal do buffer para um sensor/eixo específico"""
        if not self.data_buffer:
            return []
        
        signal = []
        for point in self.data_buffer:
            if sensor == 'm1':
                signal.append(point['m1'][axis])
            else:
                signal.append(point['m2'][axis])
        
        return signal
    
    def find_peaks(self, fft_magnitude: np.ndarray, min_freq: float = 1.0) -> Tuple[float, float, int]:
        """Encontra picos no espectro FFT, ignorando frequências muito baixas"""
        if len(fft_magnitude) == 0:
            return 0.0, 0.0, 0
        
        # Ignorar frequências muito baixas (abaixo de min_freq Hz)
        min_idx = int(min_freq / self.freq_resolution)
        magnitude = fft_magnitude[min_idx:]
        
        if len(magnitude) == 0:
            return 0.0, 0.0, 0
        
        # Encontrar índice do pico máximo
        max_idx = np.argmax(magnitude) + min_idx
        
        # Verificar se é um pico válido
        if max_idx >= len(fft_magnitude):
            return 0.0, 0.0, 0
        
        # Frequência do pico
        peak_freq = max_idx * self.freq_resolution
        
        # Amplitude do pico
        peak_amp = fft_magnitude[max_idx]
        
        return peak_freq, peak_amp, max_idx
    
    def calculate_rms(self, sensor: str = 'm1', axis: str = 'x', 
                     window: int = 100) -> float:
        """Calcula valor RMS para uma janela de amostras"""
        if not self.data_buffer or len(self.data_buffer) < window:
            return 0.0
        
        # Pegar últimas N amostras
        recent_data = self.data_buffer[-window:]
        
        # Extrair valores
        values = []
        for point in recent_data:
            if sensor == 'm1':
                values.append(point['m1'][axis])
            else:
                values.append(point['m2'][axis])
        
        # Calcular RMS
        squared = np.square(values)
        mean_squared = np.mean(squared)
        rms = np.sqrt(mean_squared)
        
        return rms
    
    def frequency_to_rpm(self, freq_hz: float) -> float:
        """Converte Hz para RPM baseado nos dados reais do motor"""
        factor = self.rpm_factors.get(self.config.motor_frequency, 29.3)
        return freq_hz * 60  # Hz → RPM
    
    def find_harmonics(self, fundamental_freq: float, fft_magnitude: np.ndarray, 
                      max_harmonics: int = 6) -> List[Dict]:
        """Encontra harmônicos da frequência fundamental"""
        harmonics = []
        
        if fundamental_freq <= 0 or len(fft_magnitude) == 0:
            return harmonics
        
        for h in range(2, max_harmonics + 1):
            target_freq = fundamental_freq * h
            
            # Verificar se harmônico está dentro da faixa
            if target_freq > (self.config.sample_rate / 2):
                break
            
            target_idx = int(round(target_freq / self.freq_resolution))
            
            # Buscar em torno da frequência esperada
            search_range = 2
            start_idx = max(1, target_idx - search_range)
            end_idx = min(len(fft_magnitude) - 1, target_idx + search_range)
            
            max_amp = 0
            found_freq = target_freq
            
            for idx in range(start_idx, end_idx + 1):
                amp = fft_magnitude[idx]
                if amp > max_amp:
                    max_amp = amp
                    found_freq = idx * self.freq_resolution
            
            # Só incluir se amplitude > threshold
            if max_amp > (self.config.noise_threshold / 20):
                harmonics.append({
                    'harmonic': h,
                    'frequency': found_freq,
                    'amplitude': max_amp,
                    'rpm': self.frequency_to_rpm(found_freq),
                    'ratio': found_freq / fundamental_freq if fundamental_freq > 0 else 0
                })
        
        return harmonics
    
    def calculate_imbalance(self, amp1: float, amp2: float) -> float:
        """Calcula percentual de desbalanceamento"""
        if amp1 <= 0 and amp2 <= 0:
            return 0.0
        
        max_amp = max(amp1, amp2)
        imbalance = abs(amp1 - amp2) / max_amp * 100 if max_amp > 0 else 0
        return imbalance
    
    def calculate_current_noise(self, window: int = 50) -> float:
        """Calcula nível de ruído atual (RMS dos últimos pontos)"""
        if not self.data_buffer or len(self.data_buffer) < window:
            return 0.0
        
        recent_data = self.data_buffer[-window:]
        
        # Extrair valores do eixo X do sensor 1
        values = []
        for point in recent_data:
            values.append(point['m1']['x'])
        
        # Calcular RMS
        squared = np.square(values)
        mean_squared = np.mean(squared)
        noise = np.sqrt(mean_squared)
        
        return noise
    
    def get_buffer_info(self) -> Dict:
        # Se a taxa de chegada ideal é, por ex., 10 ms (100 Hz)
        ideal_interval = 10.0  

        if self.avg_interval is None:
            load = 0
        else:
            load = min(100, (self.avg_interval / ideal_interval) * 100)

        return {
            'buffer_usage': load,
        'total_samples': self.total_samples,
        'collection_time': time.time() - self.start_time
    }
    
    def process_realtime_update(self) -> Optional[Dict]:
        """Processa dados para atualização em tempo real"""
        if len(self.data_buffer) < 100:
            return None
        
        # Sinal para FFT
        signal1_x = self.extract_signal('m1', 'x')
        signal2_x = self.extract_signal('m2', 'x')
        
        # Calcular FFTs
        fft1 = self.calculate_fft(signal1_x, 'x')
        fft2 = self.calculate_fft(signal2_x, 'x')
        
        # Encontrar picos (ignorando frequências abaixo de 1Hz)
        peak1_freq, peak1_amp, _ = self.find_peaks(fft1, min_freq=1.0)
        peak2_freq, peak2_amp, _ = self.find_peaks(fft2, min_freq=1.0)
        
        # Converter para RPM
        peak1_rpm = self.frequency_to_rpm(peak1_freq)
        peak2_rpm = self.frequency_to_rpm(peak2_freq)
        
        # Calcular RMS para todos os eixos
        rms1_x = self.calculate_rms('m1', 'x')
        rms1_y = self.calculate_rms('m1', 'y')
        rms1_z = self.calculate_rms('m1', 'z')
        
        rms2_x = self.calculate_rms('m2', 'x')
        rms2_y = self.calculate_rms('m2', 'y')
        rms2_z = self.calculate_rms('m2', 'z')
        
        # Desbalanceamento
        imbalance = self.calculate_imbalance(peak1_amp, peak2_amp)
        
        # Harmônicos
        harmonics = self.find_harmonics(peak1_freq, fft1)
        
        # Nível de ruído atual
        current_noise = self.calculate_current_noise()
        
        # Informações do buffer
        buffer_info = self.get_buffer_info()
        
        # Preparar dados para envio
        update_data = {
            'timestamp': time.time(),
            'collection_time': buffer_info['collection_time'],
            'total_samples': buffer_info['total_samples'],
            'time_data': self.data_buffer[-100:],  # Últimas 100 amostras
            'fft': {
                'm1': fft1.tolist(),
                'm2': fft2.tolist()
            },
            'peaks': {
                'm1': {
                    'frequency': peak1_freq,
                    'amplitude': peak1_amp,
                    'rpm': peak1_rpm
                },
                'm2': {
                    'frequency': peak2_freq,
                    'amplitude': peak2_amp,
                    'rpm': peak2_rpm
                }
            },
            'rms': {
                'm1': {'x': rms1_x, 'y': rms1_y, 'z': rms1_z},
                'm2': {'x': rms2_x, 'y': rms2_y, 'z': rms2_z}
            },
            'imbalance': imbalance,
            'harmonics': harmonics,
            'current_noise': current_noise,
            'buffer_status': buffer_info['buffer_usage']
        }
        
        return update_data
    
    def clear_data(self):
        """Limpa todos os dados"""
        self.data_buffer = []
        self.total_samples = 0
        self.start_time = time.time()
        logger.info("Dados limpos")