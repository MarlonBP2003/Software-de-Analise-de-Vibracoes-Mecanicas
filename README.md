# Sistema de Análise de Vibrações v8.5.2

Software técnico-científico para **aquisição, instrumentação e análise de vibrações mecânicas em sistemas rotativos**, com processamento em tempo real e aplicação de técnicas no domínio da frequência, incluindo **FFT**.

📌 Parte integrante do **Trabalho de Conclusão de Curso (TCC)** em Engenharia Mecânica.  
📄 **Registro de Programa de Computador no INPI**, publicado na Revista da Propriedade Intelectual (RPI).

---

## 👤 Autor
**Marlon Biagi Parangaba**  
📧 Email: eng.parangaba@gmail.com  
📅 Desenvolvimento: Dezembro de 2025  

---

## 🎯 Características Principais
- **Alta resolução espectral:** FFT de 2048 pontos (0,0977 Hz/bin)
- **Dupla aquisição:** 2 sensores MPU6050 via I2C multiplexado
- **Taxa de amostragem:** 200 Hz (5 ms por amostra)
- **Processamento em tempo real:** FFT, RMS, harmônicos e análise de desbalanceamento
- **Filtro IIR:** suavização avançada de sinais
- **Threshold inteligente:** eliminação adaptativa de ruído
- **Conversão precisa:** Hz → RPM baseada em dados reais do motor
- **Exportação completa:** dados em CSV para análise posterior
- **Interface moderna:** aplicação web responsiva com gráficos interativos

---

## 🧪 Funcionalidades Avançadas
- Detecção automática da frequência dominante
- Cálculo de harmônicos até a 6ª ordem
- Análise comparativa de desbalanceamento entre mancais
- Monitoramento do nível de ruído em tempo real
- Gravação controlada de testes experimentais
- Exportação de dados brutos e processados
- Calibração automática dos sensores
- Interface responsiva (desktop e mobile)

---

## ⚙️ Especificações Técnicas

### Software
- **Backend:** Python 3.8+ (Flask, Socket.IO, NumPy, SciPy)
- **Frontend:** HTML5, CSS3, JavaScript (Chart.js)
- **FFT:** 2048 pontos, janela de Hann, remoção de componente DC

### Hardware
- **Microcontrolador:** ESP32 (comunicação Serial USB)
- **Sensores:** 2× MPU6050 (acelerômetro e giroscópio de 3 eixos)
- **Protocolo:** Comunicação serial a 921600 baud
- **Buffer:** 4096 amostras (~20 s a 200 Hz)

---

## 🔄 Fatores de Conversão Frequência → RPM (Dados Experimentais)
- 10 Hz → 283 RPM (Fator 28,3)
- 20 Hz → 582,7 RPM (Fator 29,135)
- 30 Hz → 880,2 RPM (Fator 29,34)
- 40 Hz → 1176 RPM (Fator 29,4)
- 50 Hz → 1481 RPM (Fator 29,62)
- 60 Hz → 1779 RPM (Fator 29,65)

---

## ▶️ Instruções de Uso
1. Conecte o ESP32 ao computador via cabo USB
2. Suba o arquivo `esp_vibrational_serial.ino` no ESP32
3. Execute o script `start.bat` para iniciar o servidor
4. Acesse `http://localhost:5000` no navegador
5. Selecione a porta COM (geralmente COM3)
6. Clique em **Conectar** para estabelecer a comunicação
7. Aguarde a calibração automática dos sensores
8. Configure os parâmetros conforme a aplicação
9. Inicie os testes e exporte os dados para análise

---

## 📁 Estrutura de Arquivos
```text
vibration_system/
├── app/
│   ├── main.py            # Servidor principal
│   ├── serial_reader.py   # Leitor serial
│   ├── data_processor.py  # Processamento de dados
│   └── config.py          # Configurações
├── static/
│   ├── app.js             # JavaScript
│   └── style.css          # Estilos
├── templates/
│   └── index.html         # Interface principal
├── data/
│   ├── tests/             # Testes exportados
│   └── calibrations/      # Calibrações
├── start.bat              # Script de inicialização
├── build.py               # Script de build
└── requirements.txt       # Dependências
```

## 💻 Compatibilidade
- **Sistemas Operacionais:** Windows 10/11, Linux, macOS
- **Navegadores:** Chrome 90+, Firefox 88+, Edge 90+
- **Python:** 3.8 ou superior
- **Hardware:** ESP32 com firmware específico

---

## ⚠️ Limitações Conhecidas
- Taxa máxima de amostragem: 200 Hz por sensor
- Resolução máxima da FFT: 2048 pontos
- Faixa de frequência analisável: 0–100 Hz (limite de Nyquist a 200 Hz)
- Buffer máximo: 4096 amostras por sensor

---

## 🚀 Próximas Atualizações Planejadas
- Atualização no dimensionamento da bancada experimental, esquadrias e encaixes mecânicos
- Implementação de análise de envelope para detecção de falhas
- Integração com bancos de dados e sistemas de monitoramento (Zabbix e Grafana)
- Geração automática de relatórios técnicos em formato PDF
- Análise de tendências históricas de vibração
- Sistema de alertas automáticos por e-mail

---

## 🛠️ Suporte
Para dúvidas, sugestões ou suporte técnico, entre em contato:

- **Email:** eng.parangaba@gmail.com  
- **Horário de atendimento:** Segunda a sexta-feira, das 9h às 17h

---

## 📜 Licença e Direitos Autorais
© 2025 Marlon Biagi Parangaba. Todos os direitos reservados.

Este software é protegido por direitos autorais e registrado no INPI.
A disponibilização do código-fonte neste repositório não concede, de forma implícita
ou explícita, qualquer licença para uso, modificação, redistribuição ou exploração
comercial sem autorização expressa do autor.

Para uso acadêmico, científico ou industrial supervisionado, entre em contato com o autor.
