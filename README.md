# Sistema de Análise de Vibrações v8.5.2

[![INPI Registrado](https://img.shields.io/badge/INPI-BR512025006741--0-00A859?style=for-the-badge&logo=brazil&logoColor=white)](docs/Certificado_de_registro.pdf)
[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-Proprietário-red?style=for-the-badge)](LICENSE)

Software técnico-científico para **aquisição, instrumentação e análise de vibrações mecânicas em sistemas rotativos**, com processamento em tempo real e aplicação de técnicas no domínio da frequência, incluindo **FFT**.

📌 Parte integrante do **Trabalho de Conclusão de Curso (TCC)** em Engenharia Mecânica.  
📄 **Software Registrado no INPI** sob o número **BR512025006741-0** - [Consulte o certificado completo](docs/Certificado_de_registro.pdf)

---

## 🏆 Registro de Propriedade Intelectual

<table>
<tr>
<td width="70%">

**Titular:** Marlon Biagi Parangaba  
**Processo INPI:** BR512025006741-0  
**Data de Criação:** 06/12/2025  
**Data de Publicação:** 09/12/2025  
**Data de Expedição:** 23/12/2025  
**Validade:** 50 anos a partir de 01/01/2026  

Este software possui **registro de programa de computador** concedido pelo Instituto Nacional da Propriedade Industrial (INPI), garantindo proteção legal dos direitos autorais até **01/01/2076**.

</td>
<td width="30%" align="center">

[![Ver Certificado](https://img.shields.io/badge/📄_Ver_Certificado-INPI-00A859?style=for-the-badge)](docs/Certificado_de_registro.pdf)

[![Validar Registro](https://img.shields.io/badge/🔍_Validar-INPI-blue?style=for-the-badge)](https://gru.inpi.gov.br/pePI/servlet/ProgramaServletController)

</td>
</tr>
</table>

### 📋 Dados Técnicos do Registro

| Campo | Informação |
|-------|-----------|
| **Título Oficial** | Software Técnico-Científico para Aquisição, Instrumentação e Análise de Vibrações Mecânicas em Sistemas Rotativos com FFT |
| **Linguagens** | C++, HTML, JavaScript, Python, CSS |
| **Campos de Aplicação** | EN-05, FQ-03, IF-01, IN-03 |
| **Tipo de Programa** | FA-04, GI-04, IT-02, SM-01, TC-01 |
| **Algoritmo Hash** | SHA-512 |
| **Chefe da DIPTO** | Erica Guimarães Correa |

> 💡 **Para validar a autenticidade do registro**, acesse o [Portal do INPI](https://gru.inpi.gov.br/pePI/servlet/ProgramaServletController) e consulte o processo **BR512025006741-0**.

---

## 👤 Autor e Titular dos Direitos

**Marlon Biagi Parangaba**  
Engenheiro Mecânico  
📧 Email: [eng.parangaba@gmail.com](mailto:eng.parangaba@gmail.com)  
🔗 GitHub: [@marlon-parangaba](https://github.com/marlon-parangaba)  
📅 Desenvolvimento: Dezembro de 2025

---

## 🎯 Características Principais

* **Alta resolução espectral:** FFT de 2048 pontos (0,0977 Hz/bin)
* **Dupla aquisição:** 2 sensores MPU6050 via I2C multiplexado
* **Taxa de amostragem:** 200 Hz (5 ms por amostra)
* **Processamento em tempo real:** FFT, RMS, harmônicos e análise de desbalanceamento
* **Filtro IIR:** suavização avançada de sinais
* **Threshold inteligente:** eliminação adaptativa de ruído
* **Conversão precisa:** Hz → RPM baseada em dados reais do motor
* **Exportação completa:** dados em CSV para análise posterior
* **Interface moderna:** aplicação web responsiva com gráficos interativos

---

## 🧪 Funcionalidades Avançadas

* Detecção automática da frequência dominante
* Cálculo de harmônicos até a 6ª ordem
* Análise comparativa de desbalanceamento entre mancais
* Monitoramento do nível de ruído em tempo real
* Gravação controlada de testes experimentais
* Exportação de dados brutos e processados
* Calibração automática dos sensores
* Interface responsiva (desktop e mobile)

---

## ⚙️ Especificações Técnicas

### Software

* **Backend:** Python 3.8+ (Flask, Socket.IO, NumPy, SciPy)
* **Frontend:** HTML5, CSS3, JavaScript (Chart.js)
* **FFT:** 2048 pontos, janela de Hann, remoção de componente DC

### Hardware

* **Microcontrolador:** ESP32 (comunicação Serial USB)
* **Sensores:** 2× MPU6050 (acelerômetro e giroscópio de 3 eixos)
* **Protocolo:** Comunicação serial a 921600 baud
* **Buffer:** 4096 amostras (~20 s a 200 Hz)

---

## 🔄 Fatores de Conversão Frequência → RPM (Dados Experimentais)

* 10 Hz → 283 RPM (Fator 28,3)
* 20 Hz → 582,7 RPM (Fator 29,135)
* 30 Hz → 880,2 RPM (Fator 29,34)
* 40 Hz → 1176 RPM (Fator 29,4)
* 50 Hz → 1481 RPM (Fator 29,62)
* 60 Hz → 1779 RPM (Fator 29,65)

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

```
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
├── docs/
│   ├── Certificado_de_registro.pdf  # Certificado de Registro INPI
│   └── manual_usuario.pdf           # Manual do usuário
├── esp32/
│   └── esp_vibrational_serial.ino   # Firmware ESP32
├── start.bat              # Script de inicialização
├── build.py               # Script de build
├── requirements.txt       # Dependências
├── CITATION.cff           # BibTeX
├── NOTICE.md              # Aviso de Registro
├── LICENSE                # Licença
└── README.md              # Este arquivo
```

---

## 💻 Compatibilidade

* **Sistemas Operacionais:** Windows 10/11, Linux, macOS
* **Navegadores:** Chrome 90+, Firefox 88+, Edge 90+
* **Python:** 3.8 ou superior
* **Hardware:** ESP32 com firmware específico

---

## ⚠️ Limitações Conhecidas

* Taxa máxima de amostragem: 200 Hz por sensor
* Resolução máxima da FFT: 2048 pontos
* Faixa de frequência analisável: 0–100 Hz (limite de Nyquist a 200 Hz)
* Buffer máximo: 4096 amostras por sensor

---

## 🚀 Próximas Atualizações Planejadas

* Atualização no dimensionamento da bancada experimental, esquadrias e encaixes mecânicos
* Implementação de análise de envelope para detecção de falhas
* Integração com bancos de dados e sistemas de monitoramento (Zabbix e Grafana)
* Geração automática de relatórios técnicos em formato PDF
* Análise de tendências históricas de vibração
* Sistema de alertas automáticos por e-mail

---

## 📚 Citação Acadêmica

Se você utilizar este software em trabalhos acadêmicos ou publicações científicas, por favor cite:

### ABNT
```
PARANGABA, M. B. Software Técnico-Científico para Aquisição, Instrumentação e 
Análise de Vibrações Mecânicas em Sistemas Rotativos com FFT. [S.l.]: Software 
Registrado no INPI, 2025. Versão 8.5.2. Processo INPI nº BR512025006741-0. 
Disponível em: https://github.com/marlon-parangaba/Software-de-Analise-de-Vibracoes-Mecanicas
```

### BibTeX
```bibtex
@software{parangaba2025vibracoes,
  author = {Parangaba, Marlon Biagi},
  title = {Software Técnico-Científico para Aquisição, Instrumentação e Análise de Vibrações Mecânicas em Sistemas Rotativos com FFT},
  year = {2025},
  version = {8.5.2},
  note = {Processo INPI nº BR512025006741-0},
  url = {https://github.com/marlon-parangaba/Software-de-Analise-de-Vibracoes-Mecanicas},
  publisher = {Registro INPI},
  month = {dezembro}
}
```

---

## 🛠️ Suporte

Para dúvidas, sugestões ou suporte técnico, entre em contato:

* **Email:** [eng.parangaba@gmail.com](mailto:eng.parangaba@gmail.com)
* **GitHub Issues:** [Abrir Issue](https://github.com/marlon-parangaba/Software-de-Analise-de-Vibracoes-Mecanicas/issues)
* **Horário de atendimento:** Segunda a sexta-feira, das 9h às 17h

---

## 📜 Licença e Direitos Autorais

© 2025 Marlon Biagi Parangaba. Todos os direitos reservados.

**Este software é protegido por direitos autorais e registrado no INPI (Processo BR512025006741-0).**

A disponibilização do código-fonte neste repositório não concede, de forma implícita ou explícita, qualquer licença para uso, modificação, redistribuição ou exploração comercial sem autorização expressa do titular.

### Uso Permitido

✅ Visualização do código para fins educacionais  
✅ Citação em trabalhos acadêmicos (com devida referência)  
✅ Uso supervisionado em ambiente acadêmico (mediante autorização)

### Uso Proibido

❌ Cópia, modificação ou redistribuição sem autorização  
❌ Uso comercial ou industrial sem licença  
❌ Remoção ou alteração de avisos de copyright  
❌ Engenharia reversa para fins comerciais

Para solicitar autorização de uso, licenciamento comercial ou parcerias, entre em contato através do email [eng.parangaba@gmail.com](mailto:eng.parangaba@gmail.com).

### Proteção Legal

Este software está protegido pelas seguintes legislações:

* **Lei nº 9.609/1998** (Lei de Software)
* **Lei nº 9.610/1998** (Lei de Direitos Autorais)
* **Constituição Federal, Art. 5º, XXVII e XXVIII**

**Validade do Registro:** 50 anos a partir de 01/01/2026 (até 01/01/2076)

---

## 🔗 Links Úteis

* [📄 Certificado INPI Completo](docs/Certificado_de_registro.pdf)
* [🔍 Portal INPI - Consulta de Programas](https://gru.inpi.gov.br/pePI/servlet/ProgramaServletController)
* [📰 Revista da Propriedade Intelectual (RPI)](http://revistas.inpi.gov.br/rpi/)
* [📖 CITATION.cff](CITATION.cff)
* [⚖️ NOTICE.md](NOTICE.md)

---

**Desenvolvido com 💚 no Brasil 🇧🇷**
