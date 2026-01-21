/**
 * SISTEMA DE ANÁLISE VIBRACIONAL - ESP32
 * Desenvolvido por: Marlon Biagi Parangaba
 * Email: eng.parangaba@gmail.com
 * Data: Dezembro 2025
 * 
 * Coleta dados de 2 sensores MPU6050 via I2C multiplexado
 * Envia dados via Serial USB para processamento no PC
 */

#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// ========== CONFIGURAÇÃO ==========
#define TCA_ADDRESS 0x70           // Endereço do multiplexador I2C
#define CHANNEL_MANCAL1 7          // Canal do Mancal 1
#define CHANNEL_MANCAL2 6          // Canal do Mancal 2

// Sensores
Adafruit_MPU6050 mpu1, mpu2;

// Parâmetros do sistema
#define SAMPLE_RATE 200            // 200 Hz = 5ms entre amostras
const int SAMPLE_INTERVAL = 1000000 / SAMPLE_RATE;  // 5000µs

// Calibração
float offset1_x = 0, offset1_y = 0, offset1_z = 1.0;
float offset2_x = 0, offset2_y = 0, offset2_z = 1.0;

// Filtro IIR (suavização)
float filtered1_x = 0, filtered1_y = 0, filtered1_z = 0;
float filtered2_x = 0, filtered2_y = 0, filtered2_z = 0;
const float FILTER_ALPHA = 0.2;    // Fator de suavização (0.1-0.3)

// Controle
unsigned long last_sample = 0;
unsigned long sample_count = 0;
unsigned long start_time = 0;

// ========== FUNÇÕES AUXILIARES ==========

/**
 * Seleciona canal no multiplexador I2C
 */
void tcaSelect(uint8_t channel) {
    if (channel > 7) return;
    Wire.beginTransmission(TCA_ADDRESS);
    Wire.write(1 << channel);
    Wire.endTransmission();
    delayMicroseconds(50);  // Pequeno delay para estabilização
}

/**
 * Inicializa sensor MPU6050
 */
bool initMPU(Adafruit_MPU6050 &mpu, uint8_t channel, const char* name) {
    Serial.print("Inicializando ");
    Serial.println(name);
    
    tcaSelect(channel);
    delay(100);
    
    if (!mpu.begin(0x68)) {
        Serial.println("  ❌ Falha na comunicação");
        return false;
    }
    
    // Configurações otimizadas para vibração
    mpu.setAccelerometerRange(MPU6050_RANGE_2_G);    // ±2g para melhor resolução
    mpu.setGyroRange(MPU6050_RANGE_250_DEG);         // ±250°/s
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);      // Filtro anti-aliasing
    
    Serial.println("  ✅ OK");
    return true;
}

/**
 * Calibra sensor removendo offsets
 */
void calibrateSensor(Adafruit_MPU6050 &mpu, uint8_t channel, 
                     float &off_x, float &off_y, float &off_z) {
    Serial.print("Calibrando sensor canal ");
    Serial.println(channel);
    
    const int samples = 200;       // 200 amostras para calibração
    float sum_x = 0, sum_y = 0, sum_z = 0;
    
    for (int i = 0; i < samples; i++) {
        sensors_event_t a, g, temp;
        tcaSelect(channel);
        mpu.getEvent(&a, &g, &temp);
        
        sum_x += a.acceleration.x;
        sum_y += a.acceleration.y;
        sum_z += a.acceleration.z;
        
        delay(5);  // Pequeno delay entre leituras
    }
    
    // Calcular médias
    off_x = sum_x / samples;
    off_y = sum_y / samples;
    off_z = (sum_z / samples) - 1.0;  // Remover gravidade (1g)
    
    Serial.printf("  Offsets: X=%.4f, Y=%.4f, Z=%.4f g\n", off_x, off_y, off_z);
}

/**
 * Filtro passa-baixa IIR (suavização exponencial)
 */
float applyLowPassFilter(float newValue, float &filteredValue, float alpha = 0.2) {
    filteredValue = alpha * newValue + (1.0 - alpha) * filteredValue;
    return filteredValue;
}

/**
 * Lê e filtra dados do sensor
 */
bool readAndFilterSensor(Adafruit_MPU6050 &mpu, uint8_t channel,
                        float &x_out, float &y_out, float &z_out,
                        float off_x, float off_y, float off_z,
                        float &filt_x, float &filt_y, float &filt_z) {
    
    sensors_event_t a, g, temp;
    tcaSelect(channel);
    
    if (!mpu.getEvent(&a, &g, &temp)) {
        return false;  // Falha na leitura
    }
    
    // Converter g para mm/s² e remover offset
    const float G_TO_MM_S2 = 9806.65;  // 1g = 9806.65 mm/s²
    
    float x_raw = (a.acceleration.x - off_x) * G_TO_MM_S2;
    float y_raw = (a.acceleration.y - off_y) * G_TO_MM_S2;
    float z_raw = (a.acceleration.z - off_z) * G_TO_MM_S2;
    
    // Aplicar filtro
    x_out = applyLowPassFilter(x_raw, filt_x, FILTER_ALPHA);
    y_out = applyLowPassFilter(y_raw, filt_y, FILTER_ALPHA);
    z_out = applyLowPassFilter(z_raw, filt_z, FILTER_ALPHA);
    
    return true;
}

// ========== SETUP ==========

void setup() {
    Serial.begin(921600);  // Alta velocidade para transmissão serial
    delay(2000);  // Aguardar estabilização
    
    Serial.println("\n");
    Serial.println("================================================");
    Serial.println("🚀 SISTEMA DE ANÁLISE VIBRACIONAL - ESP32");
    Serial.println("Desenvolvido por: Marlon Biagi Parangaba");
    Serial.println("Email: eng.parangaba@gmail.com");
    Serial.println("================================================");
    Serial.println();
    
    // Inicializar I2C
    Wire.begin(21, 22);  // SDA=21, SCL=22
    Wire.setClock(400000);  // I2C a 400kHz
    
    // Inicializar sensores
    Serial.println("🔧 INICIALIZANDO SENSORES MPU6050...");
    if (!initMPU(mpu1, CHANNEL_MANCAL1, "MANCAL 1") || 
        !initMPU(mpu2, CHANNEL_MANCAL2, "MANCAL 2")) {
        Serial.println("\n❌ ERRO: Verifique as conexões I2C dos sensores!");
        Serial.println("   - Tensão de alimentação (3.3V ou 5V)");
        Serial.println("   - Conexões SDA/SCL corretas");
        Serial.println("   - Endereço I2C (0x68 ou 0x69)");
        while(1);  // Parar execução
    }
    
    // Calibração inicial
    Serial.println("\n📊 CALIBRANDO SENSORES (aguarde ~2 segundos)...");
    calibrateSensor(mpu1, CHANNEL_MANCAL1, offset1_x, offset1_y, offset1_z);
    delay(100);
    calibrateSensor(mpu2, CHANNEL_MANCAL2, offset2_x, offset2_y, offset2_z);
    
    Serial.println("\n✅ SISTEMA PRONTO PARA OPERAÇÃO");
    Serial.println("📊 Taxa de amostragem: 200 Hz (5ms por amostra)");
    Serial.println("🎛️  Filtro IIR ativo: alpha = 0.2");
    Serial.println("📤 Enviando dados no formato CSV via Serial USB");
    Serial.println("================================================");
    Serial.println();
    
    // Cabeçalho CSV
    Serial.println("TIMESTAMP_MS,M1_X,M1_Y,M1_Z,M2_X,M2_Y,M2_Z");
    
    start_time = millis();
}

// ========== LOOP PRINCIPAL ==========

void loop() {
    unsigned long now = micros();
    
    // Controle preciso de tempo (200 Hz)
    if (now - last_sample >= SAMPLE_INTERVAL) {
        last_sample = now;
        sample_count++;
        
        float x1, y1, z1, x2, y2, z2;
        
        // Ler sensor 1
        if (!readAndFilterSensor(mpu1, CHANNEL_MANCAL1, x1, y1, z1,
                                offset1_x, offset1_y, offset1_z,
                                filtered1_x, filtered1_y, filtered1_z)) {
            x1 = y1 = z1 = 0;
        }
        
        // Ler sensor 2
        if (!readAndFilterSensor(mpu2, CHANNEL_MANCAL2, x2, y2, z2,
                                offset2_x, offset2_y, offset2_z,
                                filtered2_x, filtered2_y, filtered2_z)) {
            x2 = y2 = z2 = 0;
        }
        
        // Enviar dados via Serial (formato CSV)
        unsigned long timestamp = millis() - start_time;
        Serial.printf("%lu,%.1f,%.1f,%.1f,%.1f,%.1f,%.1f\n",
                     timestamp, x1, y1, z1, x2, y2, z2);
        
        // Status periódico (a cada 1000 amostras = 5 segundos)
        if (sample_count % 1000 == 0) {
            float actual_rate = 1000000.0 / (now - last_sample);
            Serial.printf("#STATUS: Amostras=%lu, Taxa=%.1f Hz\n", 
                         sample_count, actual_rate);
        }
    }
    
    // Processar comandos recebidos do PC
    if (Serial.available()) {
        String command = Serial.readStringUntil('\n');
        command.trim();
        
        if (command == "RECALIBRAR") {
            Serial.println("#RECALIBRANDO_SENSORES...");
            calibrateSensor(mpu1, CHANNEL_MANCAL1, offset1_x, offset1_y, offset1_z);
            calibrateSensor(mpu2, CHANNEL_MANCAL2, offset2_x, offset2_y, offset2_z);
            Serial.println("#CALIBRACAO_CONCLUIDA");
        }
        else if (command == "RESET") {
            sample_count = 0;
            start_time = millis();
            Serial.println("#CONTADOR_RESETADO");
        }
        else if (command == "STATUS") {
            Serial.printf("#STATUS: Amostras=%lu, Taxa=%.1f Hz\n", 
                         sample_count, 1000000.0 / SAMPLE_INTERVAL);
        }
        else if (command == "VERSION") {
            Serial.println("#VERSION: Sistema Vibracional v2.0 - Marlon Biagi Parangaba");
        }
    }
    
    // Pequena pausa para não sobrecarregar
    delayMicroseconds(100);
}