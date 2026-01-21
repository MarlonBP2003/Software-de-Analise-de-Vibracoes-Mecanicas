/**
 * SISTEMA DE ANÁLISE DE VIBRAÇÕES - JavaScript
 * Desenvolvido por: Marlon Biagi Parangaba
 * Email: eng.parangaba@gmail.com
 * Data: Dezembro 2025
 */

// ========== CONFIGURAÇÕES GLOBAIS ==========
const CONFIG = {
    sampleRate: 200,
    fftSize: 2048,           // AUMENTADO para 2048 pontos
    bufferSize: 4096,        // Aumentado para 4096
    motorFrequency: 20,
    noiseThreshold: 50,
    fftRange: 100,           // Aumentado para 100 Hz
    mainAxis: 'x'
};

// Estado do sistema
const STATE = {
    connected: false,
    calibrating: false,
    testRunning: false,
    testPaused: false,
    testStartTime: null,
    testElapsed: 0,
    testInterval: null,
    testData: [],
    samplesReceived: 0,
    lastUpdate: 0,
    bufferUsage: 0,
    currentNoise: 0,
    collectionTime: 0,
    dataRate: 0,
    updateCount: 0
};

// Dados dos gráficos
const CHART_DATA = {
    time1: new Array(100).fill(0),
    time2: new Array(100).fill(0),
    fft1: new Array(1024).fill(0),  // 2048/2 = 1024 pontos
    fft2: new Array(1024).fill(0),  // 2048/2 = 1024 pontos
    peaks: {
        m1: { freq: 0, amp: 0, rpm: 0 },
        m2: { freq: 0, amp: 0, rpm: 0 }
    },
    rms: {
        m1: { x: 0, y: 0, z: 0 },
        m2: { x: 0, y: 0, z: 0 }
    },
    harmonics: []
};

// Instâncias dos gráficos
let charts = {
    time1: null,
    time2: null,
    fft1: null,
    fft2: null
};

// Socket.IO connection
let socket = null;

// Fatores de conversão RPM (dados reais)
const RPM_FACTORS = {
    10: 28.3,
    20: 29.135,
    30: 29.34,
    40: 29.4,
    50: 29.62,
    60: 29.65
};

// ========== FUNÇÕES DE INICIALIZAÇÃO ==========

/**
 * Inicializa o sistema quando a página carrega
 */
function initSystem() {
    console.log('🚀 Inicializando Sistema de Análise de Vibrações');
    console.log('👨‍💻 Desenvolvedor: Marlon Biagi Parangaba');
    console.log('📧 Email: eng.parangaba@gmail.com');
    console.log(`⚡ Configuração: FFT ${CONFIG.fftSize} pontos, Resolução: ${(CONFIG.sampleRate / CONFIG.fftSize).toFixed(4)} Hz/bin`);
    
    // Inicializar gráficos
    initCharts();
    
    // Conectar ao WebSocket
    connectWebSocket();
    
    // Carregar portas seriais disponíveis
    loadSerialPorts();
    
    // Atualizar interface periodicamente
    setInterval(updateInterface, 100);
    
    // Atualizar timer do teste
    setInterval(updateTestTimer, 100);
    
    // Atualizar status do sistema
    setInterval(updateSystemStatus, 1000);
    
    console.log('✅ Sistema inicializado com sucesso');
}

/**
 * Inicializa os gráficos Chart.js
 */
function initCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        label += context.parsed.y.toFixed(2) + ' mm/s²';
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: '#aaa', maxTicksLimit: 10 }
            },
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: '#aaa' },
                beginAtZero: true
            }
        }
    };
    
    // Calcular resolução de frequência
    const freqResolution = CONFIG.sampleRate / CONFIG.fftSize;
    const numPoints = Math.min(1024, Math.floor(CONFIG.fftRange / freqResolution));
    
    // Criar labels para FFT
    const fftLabels = Array.from({length: numPoints}, (_, i) => 
        (i * freqResolution).toFixed(2)
    );
    
    console.log(`📊 Gráficos FFT: ${numPoints} pontos, resolução: ${freqResolution.toFixed(4)} Hz/bin`);
    
    // Gráfico FFT Mancal 1
    const fftCtx1 = document.getElementById('fftChart1').getContext('2d');
    charts.fft1 = new Chart(fftCtx1, {
        type: 'line',
        data: {
            labels: fftLabels,
            datasets: [{
                label: 'Mancal 1',
                data: new Array(numPoints).fill(0),
                borderColor: '#00b4d8',
                backgroundColor: 'rgba(0, 180, 216, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0,
                pointRadius: 0
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                x: {
                    ...chartOptions.scales.x,
                    title: {
                        display: true,
                        text: 'Frequência (Hz)',
                        color: '#aaa',
                        font: { size: 12 }
                    }
                },
                y: {
                    ...chartOptions.scales.y,
                    title: {
                        display: true,
                        text: 'Amplitude (mm/s²)',
                        color: '#aaa',
                        font: { size: 12 }
                    },
                    suggestedMax: 100
                }
            }
        }
    });
    
    // Gráfico FFT Mancal 2
    const fftCtx2 = document.getElementById('fftChart2').getContext('2d');
    charts.fft2 = new Chart(fftCtx2, {
        type: 'line',
        data: {
            labels: fftLabels,
            datasets: [{
                label: 'Mancal 2',
                data: new Array(numPoints).fill(0),
                borderColor: '#e94560',
                backgroundColor: 'rgba(233, 69, 96, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0,
                pointRadius: 0
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                x: {
                    ...chartOptions.scales.x,
                    title: {
                        display: true,
                        text: 'Frequência (Hz)',
                        color: '#aaa',
                        font: { size: 12 }
                    }
                },
                y: {
                    ...chartOptions.scales.y,
                    title: {
                        display: true,
                        text: 'Amplitude (mm/s²)',
                        color: '#aaa',
                        font: { size: 12 }
                    },
                    suggestedMax: 100
                }
            }
        }
    });
    
    // Gráficos temporais
    const timeLabels = Array.from({length: 100}, (_, i) => i);
    
    const timeCtx1 = document.getElementById('timeChart1').getContext('2d');
    charts.time1 = new Chart(timeCtx1, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Mancal 1',
                data: new Array(100).fill(0),
                borderColor: '#00b4d8',
                borderWidth: 1.5,
                tension: 0.4,
                pointRadius: 0,
                fill: false
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                x: {
                    ...chartOptions.scales.x,
                    title: {
                        display: true,
                        text: 'Amostra',
                        color: '#aaa',
                        font: { size: 12 }
                    }
                },
                y: {
                    ...chartOptions.scales.y,
                    title: {
                        display: true,
                        text: 'Aceleração (mm/s²)',
                        color: '#aaa',
                        font: { size: 12 }
                    },
                    suggestedMin: -100,
                    suggestedMax: 100
                }
            }
        }
    });
    
    const timeCtx2 = document.getElementById('timeChart2').getContext('2d');
    charts.time2 = new Chart(timeCtx2, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Mancal 2',
                data: new Array(100).fill(0),
                borderColor: '#e94560',
                borderWidth: 1.5,
                tension: 0.4,
                pointRadius: 0,
                fill: false
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                x: {
                    ...chartOptions.scales.x,
                    title: {
                        display: true,
                        text: 'Amostra',
                        color: '#aaa',
                        font: { size: 12 }
                    }
                },
                y: {
                    ...chartOptions.scales.y,
                    title: {
                        display: true,
                        text: 'Aceleração (mm/s²)',
                        color: '#aaa',
                        font: { size: 12 }
                    },
                    suggestedMin: -100,
                    suggestedMax: 100
                }
            }
        }
    });
    
    console.log('📊 Gráficos inicializados com 2048 pontos FFT');
}

// ========== COMUNICAÇÃO WEBSOCKET ==========

/**
 * Conecta ao servidor WebSocket
 */
function connectWebSocket() {
    socket = io('http://localhost:5000');
    
    socket.on('connect', () => {
        console.log('🔗 Conectado ao servidor WebSocket');
        updateConnectionStatus(true, 'Conectado ao servidor');
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Desconectado do servidor WebSocket');
        updateConnectionStatus(false, 'Desconectado do servidor');
    });
    
    socket.on('connected', (data) => {
        console.log('✅ Conectado:', data.message);
    });
    
    socket.on('data_update', (data) => {
        handleDataUpdate(data);
    });
    
    socket.on('status_message', (data) => {
        console.log('📢 Status:', data.message);
        showNotification(data.message);
    });
    
    socket.on('config_update', (config) => {
        updateConfig(config);
    });
    
    socket.on('connect_error', (error) => {
        console.error('❌ Erro na conexão WebSocket:', error);
        showNotification('Erro na conexão com o servidor. Verifique se o Python está rodando.');
    });
}

/**
 * Atualiza status da conexão na interface
 */
function updateConnectionStatus(connected, message = '') {
    STATE.connected = connected;
    
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (connected) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = message || 'Conectado';
        statusText.style.color = '#00b894';
    } else {
        statusDot.className = 'status-dot';
        statusText.textContent = message || 'Desconectado';
        statusText.style.color = '#e94560';
    }
}

// ========== COMUNICAÇÃO SERIAL ==========

/**
 * Carrega portas seriais disponíveis
 */
async function loadSerialPorts() {
    try {
        const response = await fetch('/api/ports');
        const ports = await response.json();
        
        const select = document.getElementById('portSelect');
        select.innerHTML = '<option value="">Selecione a porta COM</option>';
        
        ports.forEach(port => {
            const option = document.createElement('option');
            option.value = port;
            option.textContent = port;
            select.appendChild(option);
        });
        
        console.log(`📡 Portas COM encontradas: ${ports.length} portas`);
        
        // Tentar auto-conectar na COM3 (porta comum do ESP32)
        const com3 = ports.find(p => p.includes('COM3'));
        if (com3) {
            select.value = com3;
            setTimeout(() => connectSerial(), 1000);
        }
    } catch (error) {
        console.error('Erro ao carregar portas:', error);
        showNotification('Erro ao carregar portas COM');
    }
}

/**
 * Conecta à porta serial selecionada
 */
async function connectSerial() {
    const port = document.getElementById('portSelect').value;
    
    if (!port) {
        showNotification('Selecione uma porta COM primeiro');
        return;
    }
    
    try {
        showNotification(`Conectando à porta ${port}...`);
        
        const response = await fetch('/api/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ port: port })
        });
        
        const result = await response.json();
        
        if (result.success) {
            updateConnectionStatus(true, `Conectado à ${port}`);
            showNotification(`Conectado à porta ${port}`);
            
            // Mostrar painel de calibração
            document.getElementById('calibrationPanel').classList.add('active');
            document.getElementById('calibrationStatus').className = 'calibrated';
            document.getElementById('calibrationStatus').textContent = 'Calibrado';
            
            console.log(`✅ Conectado à ${port}`);
        } else {
            showNotification(`Erro: ${result.error}`);
            console.error(`❌ Falha na conexão: ${result.error}`);
        }
    } catch (error) {
        showNotification(`Erro na conexão: ${error.message}`);
        console.error('Erro na conexão serial:', error);
    }
}

/**
 * Desconecta da porta serial
 */
async function disconnectSerial() {
    try {
        const response = await fetch('/api/disconnect');
        const result = await response.json();
        
        if (result.success) {
            updateConnectionStatus(false, 'Desconectado');
            showNotification('Desconectado da porta serial');
            
            // Esconder painel de calibração
            document.getElementById('calibrationPanel').classList.remove('active');
            document.getElementById('calibrationStatus').className = 'not-calibrated';
            document.getElementById('calibrationStatus').textContent = 'Não Calibrado';
            
            console.log('🔌 Desconectado da porta serial');
        }
    } catch (error) {
        showNotification(`Erro ao desconectar: ${error.message}`);
    }
}

/**
 * Recalibra os sensores
 */
async function recalibrateSensors() {
    if (!STATE.connected) {
        showNotification('Conecte-se ao ESP32 primeiro');
        return;
    }
    
    if (confirm('Recalibrar sensores? Esta operação levará alguns segundos.')) {
        try {
            STATE.calibrating = true;
            showNotification('Recalibrando sensores...');
            
            const response = await fetch('/api/calibrate');
            const result = await response.json();
            
            if (result.success) {
                showNotification('Calibração concluída com sucesso!');
                console.log('✅ Sensores recalibrados');
            } else {
                showNotification(`Erro na calibração: ${result.error}`);
            }
        } catch (error) {
            showNotification(`Erro: ${error.message}`);
        } finally {
            STATE.calibrating = false;
        }
    }
}

// ========== PROCESSAMENTO DE DADOS ==========

/**
 * Processa atualização de dados recebida do servidor
 */
function handleDataUpdate(data) {
    if (!data || !data.fft) return;
    
    STATE.lastUpdate = Date.now();
    STATE.updateCount++;
    
    // Atualizar estatísticas
    STATE.samplesReceived = data.total_samples || STATE.samplesReceived;
    STATE.bufferUsage = data.buffer_status || STATE.bufferUsage;
    STATE.collectionTime = data.collection_time || STATE.collectionTime;
    STATE.currentNoise = data.current_noise || STATE.currentNoise;
    
    // Calcular taxa de dados
    const now = Date.now();
    if (STATE.lastDataTime) {
        const timeDiff = (now - STATE.lastDataTime) / 1000;
        if (timeDiff > 0) {
            STATE.dataRate = STATE.updateCount / timeDiff;
        }
    }
    STATE.lastDataTime = now;
    
    // Atualizar dados FFT
    const freqResolution = CONFIG.sampleRate / CONFIG.fftSize;
    const numPoints = Math.min(1024, Math.floor(CONFIG.fftRange / freqResolution));
    
    // Garantir que temos dados suficientes
    if (data.fft.m1 && data.fft.m1.length >= numPoints) {
        CHART_DATA.fft1 = data.fft.m1.slice(0, numPoints);
    }
    
    if (data.fft.m2 && data.fft.m2.length >= numPoints) {
        CHART_DATA.fft2 = data.fft.m2.slice(0, numPoints);
    }
    
    // Atualizar dados temporais
    if (data.time_data && data.time_data.length > 0) {
        const axis = CONFIG.mainAxis;
        CHART_DATA.time1 = data.time_data.map(d => d.m1[axis] || 0);
        CHART_DATA.time2 = data.time_data.map(d => d.m2[axis] || 0);
    }
    
    // Atualizar picos
    if (data.peaks) {
        CHART_DATA.peaks.m1 = {
            frequency: data.peaks.m1?.frequency || 0,
            amplitude: data.peaks.m1?.amplitude || 0,
            rpm: data.peaks.m1?.rpm || 0,
        };
        CHART_DATA.peaks.m2 = {
            frequency: data.peaks.m2?.frequency || 0,
            amplitude: data.peaks.m2?.amplitude || 0,
            rpm: data.peaks.m2?.rpm || 0,
    };

    // Validar picos (não mostrar lixo abaixo de 1 Hz)
    if (CHART_DATA.peaks.m1.frequency < 1.0) {
        CHART_DATA.peaks.m1.frequency = 0;
        CHART_DATA.peaks.m1.amplitude = 0;
        CHART_DATA.peaks.m1.rpm = 0;
    }

    if (CHART_DATA.peaks.m2.frequency < 1.0) {
        CHART_DATA.peaks.m2.frequency = 0;
        CHART_DATA.peaks.m2.amplitude = 0;
        CHART_DATA.peaks.m2.rpm = 0;
    }
}
    
    // Atualizar RMS
    if (data.rms) {
        CHART_DATA.rms.m1 = data.rms.m1 || { x: 0, y: 0, z: 0 };
        CHART_DATA.rms.m2 = data.rms.m2 || { x: 0, y: 0, z: 0 };
    }
    
    // Atualizar harmônicos
    if (data.harmonics) {
        CHART_DATA.harmonics = data.harmonics || [];
    }
    
    // Atualizar desbalanceamento
    if (data.imbalance !== undefined) {
        document.getElementById('imbalance').textContent = data.imbalance.toFixed(1);
    }
    
    // Se teste rodando, coletar dados
    if (STATE.testRunning && !STATE.testPaused) {
        collectTestData(data);
    }
}

/**
 * Atualiza configurações do sistema
 */
function updateConfig(config) {
    CONFIG.motorFrequency = config.motor_frequency || CONFIG.motorFrequency;
    CONFIG.noiseThreshold = config.noise_threshold || CONFIG.noiseThreshold;
    CONFIG.fftRange = config.fft_range || CONFIG.fftRange;
    CONFIG.mainAxis = config.main_axis || CONFIG.mainAxis;
    
    // Atualizar interface
    document.getElementById('motorFrequency').value = CONFIG.motorFrequency;
    document.getElementById('noiseThreshold').value = CONFIG.noiseThreshold;
    document.getElementById('fftRange').value = CONFIG.fftRange;
    document.getElementById('mainAxis').value = CONFIG.mainAxis;
    
    // Atualizar labels
    document.getElementById('currentThreshold').textContent = CONFIG.noiseThreshold;
    document.getElementById('noiseThresholdValue').textContent = CONFIG.noiseThreshold;
    document.getElementById('noiseLimit').textContent = CONFIG.noiseThreshold;
    
    // Atualizar resolução na interface
    const freqRes = CONFIG.sampleRate / CONFIG.fftSize;
    document.getElementById('freqRes').textContent = freqRes.toFixed(4);
    
    console.log(`⚙️ Configurações atualizadas: FFT Range=${CONFIG.fftRange}Hz, Threshold=${CONFIG.noiseThreshold}mm/s²`);
}

/**
 * Aplica configurações alteradas pelo usuário
 */
function applySettings() {
    const motorFreq = parseInt(document.getElementById('motorFrequency').value);
    const noiseThresh = parseInt(document.getElementById('noiseThreshold').value);
    const fftRange = parseInt(document.getElementById('fftRange').value);
    const mainAxis = document.getElementById('mainAxis').value;
    
    // Validar valores
    if (motorFreq < 10 || motorFreq > 60) {
        showNotification('Frequência do motor deve estar entre 10 e 60 Hz');
        return;
    }
    
    if (noiseThresh < 10 || noiseThresh > 200) {
        showNotification('Threshold deve estar entre 10 e 200 mm/s²');
        return;
    }
    
    if (fftRange < 10 || fftRange > 100) {
        showNotification('Faixa FFT deve estar entre 10 e 100 Hz');
        return;
    }
    
    // Atualizar configurações
    CONFIG.motorFrequency = motorFreq;
    CONFIG.noiseThreshold = noiseThresh;
    CONFIG.fftRange = fftRange;
    CONFIG.mainAxis = mainAxis;
    
    // Enviar para servidor
    if (socket) {
        socket.emit('set_motor_freq', { frequency: motorFreq });
        
        fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                motor_frequency: motorFreq,
                noise_threshold: noiseThresh,
                fft_range: fftRange,
                main_axis: mainAxis
            })
        }).then(response => response.json())
          .then(data => {
              if (data.success) {
                  showNotification('Configurações aplicadas com sucesso');
              }
          });
    }
    
    // Atualizar interface
    document.getElementById('currentThreshold').textContent = noiseThresh;
    document.getElementById('noiseThresholdValue').textContent = noiseThresh;
    document.getElementById('noiseLimit').textContent = noiseThresh;
    
    // Atualizar gráficos FFT com nova faixa
    const freqResolution = CONFIG.sampleRate / CONFIG.fftSize;
    const numPoints = Math.min(1024, Math.floor(CONFIG.fftRange / freqResolution));
    const fftLabels = Array.from({length: numPoints}, (_, i) => 
        (i * freqResolution).toFixed(2)
    );
    
    if (charts.fft1) {
        charts.fft1.data.labels = fftLabels;
        charts.fft1.update();
    }
    
    if (charts.fft2) {
        charts.fft2.data.labels = fftLabels;
        charts.fft2.update();
    }
}

// ========== ATUALIZAÇÃO DA INTERFACE ==========

/**
 * Atualiza a interface periodicamente
 */
function updateInterface() {
    // Atualizar gráficos FFT
    if (charts.fft1 && charts.fft1.data && charts.fft1.data.datasets[0]) {
        const freqResolution = CONFIG.sampleRate / CONFIG.fftSize;
        const numPoints = Math.min(1024, Math.floor(CONFIG.fftRange / freqResolution));
        
        // Garantir que temos dados suficientes
        const dataToShow = CHART_DATA.fft1.slice(0, numPoints);
        if (dataToShow.length === numPoints) {
            charts.fft1.data.datasets[0].data = dataToShow;
            charts.fft1.update('none');
        }
    }
    
    if (charts.fft2 && charts.fft2.data && charts.fft2.data.datasets[0]) {
        const freqResolution = CONFIG.sampleRate / CONFIG.fftSize;
        const numPoints = Math.min(1024, Math.floor(CONFIG.fftRange / freqResolution));
        
        const dataToShow = CHART_DATA.fft2.slice(0, numPoints);
        if (dataToShow.length === numPoints) {
            charts.fft2.data.datasets[0].data = dataToShow;
            charts.fft2.update('none');
        }
    }
    
    // Atualizar gráficos temporais
    if (charts.time1) {
        charts.time1.data.datasets[0].data = CHART_DATA.time1;
        charts.time1.update('none');
    }
    
    if (charts.time2) {
        charts.time2.data.datasets[0].data = CHART_DATA.time2;
        charts.time2.update('none');
    }
    
    // Atualizar estatísticas principais
    document.getElementById('dominantFreq').textContent = CHART_DATA.peaks.m1.frequency.toFixed(1);
    document.getElementById('dominantRPM').textContent = CHART_DATA.peaks.m1.rpm.toFixed(0);
    document.getElementById('peakAmplitude').textContent = CHART_DATA.peaks.m1.amplitude.toFixed(1);
    
    // Atualizar informações dos picos nos gráficos
    if (CHART_DATA.peaks.m1.frequency > 0) {
        document.getElementById('peak1Info').textContent =
            `Pico: ${CHART_DATA.peaks.m1.frequency.toFixed(1)} Hz (${CHART_DATA.peaks.m1.rpm.toFixed(0)} RPM)`;
    } else {
        document.getElementById('peak1Info').textContent = 'Sem picos significativos';
}

    if (CHART_DATA.peaks.m2.frequency > 0) {
        document.getElementById('peak2Info').textContent =
            `Pico: ${CHART_DATA.peaks.m2.frequency.toFixed(1)} Hz (${CHART_DATA.peaks.m2.rpm.toFixed(0)} RPM)`;
    } else {
        document.getElementById('peak2Info').textContent = 'Sem picos significativos';
}

    // Atualizar valores RMS
    document.getElementById('rms1_x').textContent = CHART_DATA.rms.m1.x.toFixed(1);
    document.getElementById('rms1_y').textContent = CHART_DATA.rms.m1.y.toFixed(1);
    document.getElementById('rms1_z').textContent = CHART_DATA.rms.m1.z.toFixed(1);
    
    document.getElementById('rms2_x').textContent = CHART_DATA.rms.m2.x.toFixed(1);
    document.getElementById('rms2_y').textContent = CHART_DATA.rms.m2.y.toFixed(1);
    document.getElementById('rms2_z').textContent = CHART_DATA.rms.m2.z.toFixed(1);
    
    document.getElementById('diff_x').textContent = Math.abs(CHART_DATA.rms.m1.x - CHART_DATA.rms.m2.x).toFixed(1);
    document.getElementById('diff_y').textContent = Math.abs(CHART_DATA.rms.m1.y - CHART_DATA.rms.m2.y).toFixed(1);
    document.getElementById('diff_z').textContent = Math.abs(CHART_DATA.rms.m1.z - CHART_DATA.rms.m2.z).toFixed(1);
    
    // Atualizar buffer e amostras
    document.getElementById('bufferStatus').textContent = `${STATE.bufferUsage.toFixed(0)}%`;
    document.getElementById('totalSamples').textContent = STATE.samplesReceived.toLocaleString('pt-BR');
    
    // Atualizar nível de ruído
    document.getElementById('currentNoise').textContent = STATE.currentNoise.toFixed(1);
    const noisePercent = Math.min(100, (STATE.currentNoise / (CONFIG.noiseThreshold * 2)) * 100);
    document.getElementById('noiseLevelBar').style.width = `${noisePercent}%`;
    
    // Atualizar cor da barra de ruído
    const noiseBar = document.getElementById('noiseLevelBar');
    if (STATE.currentNoise > CONFIG.noiseThreshold) {
        noiseBar.style.background = 'linear-gradient(90deg, #00b894, #fdcb6e, #e94560)';
    } else if (STATE.currentNoise > CONFIG.noiseThreshold * 0.7) {
        noiseBar.style.background = 'linear-gradient(90deg, #00b894, #fdcb6e)';
    } else {
        noiseBar.style.background = 'linear-gradient(90deg, #00b894, #00b4d8)';
    }
    
    // Atualizar tempo de coleta
    document.getElementById('collectionTime').textContent = Math.floor(STATE.collectionTime);
    
    // Atualizar harmônicos
    updateHarmonicsDisplay();
    
    // Atualizar status do buffer (cor)
    const bufferElement = document.getElementById('bufferStatus');
    if (STATE.bufferUsage > 90) {
        bufferElement.style.color = '#e94560';
        bufferElement.style.fontWeight = 'bold';
    } else if (STATE.bufferUsage > 70) {
        bufferElement.style.color = '#fdcb6e';
        bufferElement.style.fontWeight = 'bold';
    } else {
        bufferElement.style.color = '#00b894';
        bufferElement.style.fontWeight = '';
    }
}

/**
 * Atualiza display dos harmônicos
 */
function updateHarmonicsDisplay() {
    const container = document.getElementById('harmonicsGrid');
    
    if (!CHART_DATA.harmonics || CHART_DATA.harmonics.length === 0) {
        container.innerHTML = `
            <div class="no-harmonics">
                <i class="fas fa-info-circle"></i>
                Nenhum harmônico significativo detectado
            </div>
        `;
        return;
    }
    
    let html = '';
    
    // Fundamental (primeiro harmônico) - se tiver pico significativo
    if (CHART_DATA.peaks.m1.freq > 0 && CHART_DATA.peaks.m1.amp > 0) {
        html += `
            <div class="harmonic-card fundamental">
                <div style="font-size: 0.8em; color: #00b4d8;">FUNDAMENTAL</div>
                <div class="harmonic-value" style="color: #00b4d8;">
                    ${CHART_DATA.peaks.m1.freq.toFixed(1)} Hz
                </div>
                <div style="font-size: 0.75em;">
                    ${Math.round(CHART_DATA.peaks.m1.rpm)} RPM
                </div>
                <div style="font-size: 0.7em; margin-top: 3px;">
                    ${CHART_DATA.peaks.m1.amp.toFixed(1)} mm/s²
                </div>
            </div>
        `;
    }
    
    // Harmônicos subsequentes
    const colors = ['#06d6a0', '#ffd166', '#ef476f', '#118ab2', '#073b4c'];
    
    CHART_DATA.harmonics.forEach((harmonic, index) => {
        if (index >= 5) return; // Máximo 5 harmônicos
        
        html += `
            <div class="harmonic-card">
                <div style="font-size: 0.8em; color: ${colors[index]}">
                    ${harmonic.harmonic}ª HARMÔNICO
                </div>
                <div class="harmonic-value" style="color: ${colors[index]}">
                    ${harmonic.frequency.toFixed(1)} Hz
                </div>
                <div style="font-size: 0.75em;">
                    ${Math.round(harmonic.rpm)} RPM
                </div>
                <div style="font-size: 0.7em; margin-top: 3px;">
                    ${harmonic.amplitude.toFixed(1)} mm/s²
                </div>
                <div style="font-size: 0.65em; opacity: 0.7;">
                    ${harmonic.ratio.toFixed(2)}×
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Atualiza status do sistema
 */
async function updateSystemStatus() {
    try {
        const response = await fetch('/api/status');
        const status = await response.json();
        
        // Atualizar algumas informações
        document.getElementById('totalSamples').textContent = status.total_samples?.toLocaleString('pt-BR') || '0';
        
        // Log de status ocasional
        if (Math.random() < 0.1) { // 10% de chance
            console.log(`📊 Status: ${status.total_samples} amostras, Buffer: ${status.buffer?.toFixed(1)}%`);
        }
    } catch (error) {
        // Silencioso - não mostrar erro se o servidor não responder
    }
}

// ========== CONTROLE DE TESTE ==========

/**
 * Inicia um novo teste
 */
function startTest() {
    if (!STATE.connected) {
        showNotification('Conecte-se ao ESP32 primeiro');
        return;
    }
    
    STATE.testRunning = true;
    STATE.testPaused = false;
    STATE.testStartTime = Date.now();
    STATE.testElapsed = 0;
    STATE.testData = [];
    
    // Atualizar botões
    document.getElementById('startTestBtn').disabled = true;
    document.getElementById('pauseTestBtn').disabled = false;
    document.getElementById('stopTestBtn').disabled = false;
    document.getElementById('exportBtn').disabled = true;
    document.getElementById('pauseTestBtn').innerHTML = '<i class="fas fa-pause"></i> Pausar';
    
    // Atualizar status
    document.getElementById('testStatus').innerHTML = 
        '<i class="fas fa-play-circle"></i> Teste em execução';
    document.getElementById('testStatus').style.color = '#00b894';
    
    // Iniciar timer
    STATE.testInterval = setInterval(updateTestTimer, 100);
    
    // Enviar comando para servidor
    fetch('/api/start_test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    
    showNotification('Teste iniciado - Coletando dados...');
    console.log('▶️ Teste iniciado');
}

/**
 * Pausa/continua o teste
 */
function pauseTest() {
    if (!STATE.testRunning) return;
    
    STATE.testPaused = !STATE.testPaused;
    
    if (STATE.testPaused) {
        document.getElementById('pauseTestBtn').innerHTML = '<i class="fas fa-play"></i> Continuar';
        document.getElementById('testStatus').innerHTML = '<i class="fas fa-pause-circle"></i> Teste pausado';
        document.getElementById('testStatus').style.color = '#fdcb6e';
        console.log('⏸️ Teste pausado');
    } else {
        document.getElementById('pauseTestBtn').innerHTML = '<i class="fas fa-pause"></i> Pausar';
        document.getElementById('testStatus').innerHTML = '<i class="fas fa-play-circle"></i> Teste em execução';
        document.getElementById('testStatus').style.color = '#00b894';
        STATE.testStartTime = Date.now() - STATE.testElapsed;
        console.log('▶️ Teste continuado');
    }
}

/**
 * Para o teste atual
 */
function stopTest() {
    if (!STATE.testRunning && STATE.testData.length === 0) return;
    
    STATE.testRunning = false;
    STATE.testPaused = false;
    clearInterval(STATE.testInterval);
    
    // Atualizar botões
    document.getElementById('startTestBtn').disabled = false;
    document.getElementById('pauseTestBtn').disabled = true;
    document.getElementById('stopTestBtn').disabled = true;
    document.getElementById('exportBtn').disabled = false;
    
    // Atualizar status
    if (STATE.testData.length > 0) {
        document.getElementById('testStatus').innerHTML = 
            `<i class="fas fa-check-circle"></i> Teste finalizado (${STATE.testData.length} pontos)`;
        document.getElementById('testStatus').style.color = '#00b894';
    } else {
        document.getElementById('testStatus').innerHTML = '<i class="fas fa-info-circle"></i> Teste não iniciado';
        document.getElementById('testStatus').style.color = '#aaa';
    }
    
    // Enviar comando para servidor
    fetch('/api/stop_test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    
    showNotification(`Teste finalizado. ${STATE.testData.length} pontos coletados.`);
    console.log(`⏹️ Teste finalizado: ${STATE.testData.length} pontos coletados`);
}

/**
 * Atualiza o timer do teste
 */
function updateTestTimer() {
    if (!STATE.testRunning || STATE.testPaused) return;
    
    STATE.testElapsed = Date.now() - STATE.testStartTime;
    
    const hours = Math.floor(STATE.testElapsed / 3600000);
    const minutes = Math.floor((STATE.testElapsed % 3600000) / 60000);
    const seconds = Math.floor((STATE.testElapsed % 60000) / 1000);
    
    const timerStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('testTimer').textContent = timerStr;
}

/**
 * Coleta dados durante o teste
 */
function collectTestData(data) {
    if (!STATE.testRunning || STATE.testPaused) return;
    
    const dataPoint = {
        timestamp: new Date().toISOString(),
        elapsedMs: STATE.testElapsed,
        timeFormatted: document.getElementById('testTimer').textContent,
        dominantFreq: CHART_DATA.peaks.m1.frequency || 0,
        peakAmplitude: CHART_DATA.peaks.m1.amplitude || 0,
        imbalance: parseFloat(document.getElementById('imbalance').textContent) || 0,
        rms1_x: CHART_DATA.rms.m1.x || 0,
        rms1_y: CHART_DATA.rms.m1.y || 0,
        rms1_z: CHART_DATA.rms.m1.z || 0,
        rms2_x: CHART_DATA.rms.m2.x || 0,
        rms2_y: CHART_DATA.rms.m2.y || 0,
        rms2_z: CHART_DATA.rms.m2.z || 0,
        bufferUsage: STATE.bufferUsage,
        noiseLevel: STATE.currentNoise
    };
    
    STATE.testData.push(dataPoint);
    
    // Atualizar status periodicamente
    if (STATE.testData.length % 10 === 0) {
        document.getElementById('testStatus').innerHTML = 
            `<i class="fas fa-play-circle"></i> Teste em execução - ${STATE.testData.length} pontos coletados`;
    }
}

/**
 * Exporta dados do teste
 */
async function exportTest() {
    if (STATE.testData.length === 0) {
        showNotification('Nenhum dado de teste para exportar');
        return;
    }
    
    try {
        showNotification('Exportando dados...');
        
        const response = await fetch('/api/export_test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ testData: STATE.testData })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Dados exportados: ${result.filename}`);
            
            // Oferecer download
            const a = document.createElement('a');
            a.href = `/data/tests/${result.filename}`;
            a.download = result.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            console.log(`💾 Teste exportado: ${result.filename}`);
        } else {
            showNotification(`Erro ao exportar: ${result.error}`);
        }
    } catch (error) {
        showNotification(`Erro: ${error.message}`);
        console.error('Erro ao exportar:', error);
    }
}

// ========== FUNÇÕES AUXILIARES ==========

/**
 * Mostra notificação temporária
 */
function showNotification(message, duration = 3000) {
    // Remover notificação anterior se existir
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    // Criar nova notificação
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #1a1a2e;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        border-left: 4px solid #00b4d8;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-size: 0.9rem;
        max-width: 300px;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remover após duração
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// Adicionar animações CSS para notificações
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

/**
 * Exporta todos os dados
 */
async function exportAllData() {
    if (STATE.samplesReceived === 0) {
        showNotification('Nenhum dado para exportar');
        return;
    }
    
    try {
        showNotification('Exportando todos os dados...');
        
        // Obter dados do servidor
        const response = await fetch('/api/status');
        const status = await response.json();
        
        // Criar CSV
        let csv = 'Timestamp,Frequencia_Dominante,Amplitude_Pico,Desbalanceamento,RMS1_X,RMS1_Y,RMS1_Z,RMS2_X,RMS2_Y,RMS2_Z,Buffer_Usage,Noise_Level,Samples_Total,Collection_Time\n';
        
        // Adicionar dados atuais
        csv += `${new Date().toISOString()},${CHART_DATA.peaks.m1.freq},${CHART_DATA.peaks.m1.amp},`;
        csv += `${document.getElementById('imbalance').textContent},`;
        csv += `${CHART_DATA.rms.m1.x},${CHART_DATA.rms.m1.y},${CHART_DATA.rms.m1.z},`;
        csv += `${CHART_DATA.rms.m2.x},${CHART_DATA.rms.m2.y},${CHART_DATA.rms.m2.z},`;
        csv += `${STATE.bufferUsage},${STATE.currentNoise},`;
        csv += `${status.total_samples},${STATE.collectionTime}\n`;
        
        // Criar blob e iniciar download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vibration_data_full_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification(`Dados exportados: ${STATE.samplesReceived.toLocaleString()} amostras`);
        console.log(`💾 Todos os dados exportados`);
    } catch (error) {
        showNotification(`Erro ao exportar: ${error.message}`);
    }
}

/**
 * Limpa armazenamento local
 */
async function clearStorage() {
    if (confirm('Tem certeza que deseja limpar todos os dados armazenados?')) {
        try {
            const response = await fetch('/api/clear_data');
            const result = await response.json();
            
            if (result.success) {
                STATE.testData = [];
                STATE.samplesReceived = 0;
                document.getElementById('totalSamples').textContent = '0';
                showNotification('Armazenamento limpo');
                console.log('🗑️ Dados limpos');
            }
        } catch (error) {
            showNotification('Erro ao limpar dados');
        }
    }
}

/**
 * Mostra modal "Sobre o Sistema"
 */
function showAbout() {
    document.getElementById('aboutModal').style.display = 'block';
}

/**
 * Fecha modal
 */
function closeModal() {
    document.getElementById('aboutModal').style.display = 'none';
}

/**
 * Converte Hz para RPM
 */
function frequencyToRPM(freqHz) {
    const factor = RPM_FACTORS[CONFIG.motorFrequency] || 29.3;
    return freqHz * factor * 60;
}

// ========== INICIALIZAÇÃO ==========

// Inicializar sistema quando a página carregar
window.onload = initSystem;

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('aboutModal');
    if (event.target === modal) {
        closeModal();
    }
};

// Permitir fechar modal com ESC
document.onkeydown = function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
};

// Adicionar estilos CSS dinâmicos para gráficos
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .chart-container {
            position: relative;
            height: 350px;
            width: 100%;
        }
        
        .notification {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        /* Estilos para scrollbar no modal */
        #aboutModal .modal-body {
            max-height: 70vh;
            overflow-y: auto;
            padding-right: 10px;
        }
        
        #aboutModal .modal-body::-webkit-scrollbar {
            width: 8px;
        }
        
        #aboutModal .modal-body::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
        }
        
        #aboutModal .modal-body::-webkit-scrollbar-thumb {
            background: #00b4d8;
            border-radius: 4px;
        }
        
        #aboutModal .modal-body::-webkit-scrollbar-thumb:hover {
            background: #0099c3;
        }
    </style>
`);