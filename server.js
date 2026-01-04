const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('./index.js');
const qrcode = require('qrcode-terminal');

// Importar módulos de lógica de negócio
const { fisica } = require('./src/fisica');
const { empresa } = require('./src/empresa');
const { clientecadastro } = require('./src/clientecadastro');
const { sosregistrarcodigo } = require('./src/sosregistrarcodigo');
const { Requests } = require('./src/request');
const {
    codigoetelefone,
    checkingNumbers,
    cronJob,
    listarentregasequantidade,
    listartodosclientescadastrados,
    buscardadosdecadastradodaempresa,
    deletarentregas,
    deletarcliente,
    ativarchatbot,
    desativarchatbot,
    listarQuantidadeDeEntregasDaEmpresa,
    excluirnumerocliente
} = require('./src/middlewares');

// ========== CONFIGURAÇÃO DO SERVIDOR EXPRESS ==========
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 7005;

app.use(express.json());

// ========== VARIÁVEIS DE CONTROLE ==========
let client;
let isClientReady = false;
let canRespondToMessages = false;
let warmupTimeout = null;

const processedMessages = new Map();
const messageTracker = new Map();
const MESSAGE_CACHE_TIME = 300000; // 5 minutos
const WARMUP_PERIOD = 20000; // 20 segundos
const BLOCK_THRESHOLD = 5;
const TIME_WINDOW = 300000;

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║     SERVIDOR WHATSAPP API + BOT - INICIADO               ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('⏰ Started at:', new Date().toISOString());
console.log('═'.repeat(63));

// ========== FUNÇÕES AUXILIARES ==========
function shouldBlockMessage(phoneNumber, messageContent) {
    const key = `${phoneNumber}:${messageContent.toLowerCase().trim()}`;
    const now = Date.now();

    if (!messageTracker.has(key)) {
        messageTracker.set(key, { count: 1, firstSeen: now });
        return false;
    }

    const data = messageTracker.get(key);

    if (now - data.firstSeen > TIME_WINDOW) {
        messageTracker.set(key, { count: 1, firstSeen: now });
        return false;
    }

    data.count++;

    if (data.count >= BLOCK_THRESHOLD) {
        console.log(`BLOCKED: ${phoneNumber} - Mensagem repetida ${data.count} vezes: "${messageContent}"`);
        return true;
    }

    return false;
}

function isMessageAlreadyProcessed(messageId) {
    const now = Date.now();

    if (processedMessages.has(messageId)) {
        const processedAt = processedMessages.get(messageId);
        if (now - processedAt < MESSAGE_CACHE_TIME) {
            return true;
        }
        processedMessages.delete(messageId);
    }

    processedMessages.set(messageId, now);
    return false;
}

function cleanupOldEntries() {
    const now = Date.now();
    for (const [key, data] of messageTracker.entries()) {
        if (now - data.firstSeen > TIME_WINDOW) {
            messageTracker.delete(key);
        }
    }

    for (const [msgId, processedAt] of processedMessages.entries()) {
        if (now - processedAt > MESSAGE_CACHE_TIME) {
            processedMessages.delete(msgId);
        }
    }
}

setInterval(cleanupOldEntries, 600000);

// ========== INICIALIZAÇÃO DO CLIENTE WHATSAPP ==========
const initializeClient = () => {
    console.log('🔄 Inicializando cliente WhatsApp...');

    // Detectar se está no Railway ou outro ambiente sem display
    const isProduction = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';

    console.log('📍 AMBIENTE:', isProduction ? 'PRODUÇÃO (Railway)' : 'DESENVOLVIMENTO (Local)');
    console.log('🖥️  Modo headless:', isProduction ? 'true (sem interface)' : 'false (com interface)');

    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: isProduction ? true : false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        },
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1030410331-alpha.html'
        }
    });

    // ========== EVENTOS DO WHATSAPP ==========
    client.on('qr', async (qr) => {
        console.log('📱 QR Code gerado. Escaneie com seu WhatsApp:');
        qrcode.generate(qr, {small: true});

        const qrDataURL = await QRCode.toDataURL(qr);
        io.emit('qr', qrDataURL);
    });

    client.on('authenticated', () => {
        console.log('✅ Cliente autenticado com sucesso!');
        io.emit('authenticated');
    });

    client.on('ready', async () => {
        console.log('✅ Cliente WhatsApp pronto!');
        isClientReady = true;
        canRespondToMessages = false;

        const version = await client.getWWebVersion();
        console.log('Versão do WhatsApp Web:', version);

        io.emit('warmup_started', {
            message: 'Carregando histórico de mensagens, aguarde...',
            duration: WARMUP_PERIOD
        });

        if (warmupTimeout) {
            clearTimeout(warmupTimeout);
        }

        warmupTimeout = setTimeout(() => {
            canRespondToMessages = true;
            console.log('✅ Sistema pronto! Bot operacional.');
            io.emit('warmup_completed', { message: '✅ Sistema pronto! Bot operacional.' });

            // Iniciar cron job após warmup
            cronJob();
        }, WARMUP_PERIOD);
    });

    client.on('auth_failure', (msg) => {
        console.error('❌ Falha na autenticação:', msg);
        io.emit('auth_failure', msg);
    });

    client.on('disconnected', (reason) => {
        console.log('⚠️ Cliente desconectado:', reason);
        isClientReady = false;
        canRespondToMessages = false;

        if (warmupTimeout) {
            clearTimeout(warmupTimeout);
            warmupTimeout = null;
        }

        io.emit('disconnected', reason);

        if (reason !== 'LOGOUT') {
            console.log('🔄 Tentando reconectar em 5 segundos...');
            setTimeout(() => {
                client.initialize();
            }, 5000);
        } else {
            console.log('🚫 Logout detectado - não vai reconectar automaticamente');
        }
    });

    client.on('loading_screen', (percent, message) => {
        console.log('Carregando:', percent, '%');
        io.emit('loading', { percent, message });
    });

    // ========== PROCESSAMENTO DE MENSAGENS (LÓGICA DE NEGÓCIO) ==========
    client.on('message', async (msg) => {
        console.log('📩 Mensagem recebida:', msg.from, '-', msg.body);

        // Ignorar mensagens de status
        if (msg.from === 'status@broadcast') {
            return;
        }

        // Verificar se mensagem já foi processada
        const messageId = msg.id.id || `${msg.from}_${msg.timestamp}`;
        if (isMessageAlreadyProcessed(messageId)) {
            console.log('⚠️ Mensagem já processada ignorada:', messageId);
            return;
        }

        // Ignorar mensagens revogadas
        if (msg.type === 'revoked') {
            return;
        }

        // Ignorar tipos de mensagens do sistema
        const ignoredTypes = ['e2e_notification', 'notification', 'protocol', 'gp2', 'notification_template'];
        if (ignoredTypes.includes(msg.type)) {
            return;
        }

        // Ignorar mensagens antigas (mais de 60 segundos)
        const now = Math.floor(Date.now() / 1000);
        const messageAge = now - msg.timestamp;

        if (messageAge > 60) {
            console.log(`⚠️ Mensagem antiga ignorada (${messageAge}s)`);
            io.emit('message_ignored', { from: msg.from, body: msg.body, reason: 'old_message' });
            return;
        }

        // Ignorar mensagens durante período de aquecimento
        if (!canRespondToMessages) {
            console.log('⚠️ Mensagem ignorada (aquecimento):', msg.body);
            io.emit('message_ignored', { from: msg.from, body: msg.body, reason: 'warmup' });
            return;
        }

        // Bloquear mensagens repetidas (spam)
        if (shouldBlockMessage(msg.from, msg.body)) {
            console.log(`Mensagem bloqueada de ${msg.from}: "${msg.body}"`);
            io.emit('message_blocked', { from: msg.from, body: msg.body, reason: 'spam' });
            return;
        }

        // ========== LÓGICA DE NEGÓCIO DO BOT ==========
        let msgNumber = await checkingNumbers(msg);
        let etapaRetrieve = await Requests.retrieveEtapa(msg);
        let codigotelefone = codigoetelefone(msg.from, msgNumber);
        let buscarseexistetelefonenobanco = await Requests.buscartelefonenobanco(msg.from);

        const date = new Date();
        const h = date.getHours();

        if (etapaRetrieve !== undefined && etapaRetrieve.ativado == true) {
            sosregistrarcodigo(msg, etapaRetrieve, client);
            clientecadastro(msgNumber, msg, etapaRetrieve, client);
            const message = msg.body.toLowerCase();
            let desativar = message.slice(0, 9);
            let ativar = message.slice(0, 6);
            let listDelivery = message.includes('entregas/');

            if (buscarseexistetelefonenobanco && !listDelivery && ativar != 'ativar' && desativar != 'desativar') {
                if (h >= 10 && h < 23) {
                    empresa(msg, msgNumber, etapaRetrieve, codigotelefone, client);
                } else if (h < 10) {
                    client.sendMessage(msg.from, `Olá! 😃
Gostaríamos de informar que nosso horário de *atendimento* inicia as 🕥 10h00 até às 23h00 🕙 e as atividades das 🕥 10h30 até às 23h00 🕙.

Alguma dúvida ou assistência, recomendamos que entre em contato novamente mais tarde. 🏍️

Obrigado pela compreensão!`);
                } else if (h > 10 && h >= 23) {
                    client.sendMessage(msg.from, `Pedimos desculpas pelo inconveniente, pois nosso horário de *atendimento* é das 🕥 10h30 até às 23h00 🕙.

Se você tiver alguma dúvida ou precisar de assistência nos mande uma mensagem no grupo de whatsApp.

Agradecemos pela compreensão.`);
                }
            } else if (!buscarseexistetelefonenobanco && !listDelivery) {
                if (h >= 10 && h < 23) {
                    let registrarCode = msg.body.includes('/registrar/.');
                    let registrar = msg.body.includes('/registrar');
                    if (!registrarCode && !registrar) {
                        fisica(msg, etapaRetrieve, client, buscarseexistetelefonenobanco);
                    }
                } else if (h < 10) {
                    client.sendMessage(msg.from, `Olá! 😃
Gostaríamos de informar que nosso horário de *atendimento* inicia as 🕥 10h00 até às 23h00 🕙 e as atividades das 🕥 10h30 até às 23h00 🕙.

Alguma dúvida ou assistência, recomendamos que entre em contato novamente mais tarde. 🏍️

Obrigado pela compreensão!`);
                } else if (h > 10 && h >= 23) {
                    client.sendMessage(msg.from, `Olá! 😃
Pedimos desculpas pelo inconveniente, pois nosso horário de *atendimento* é das 🕥 10h30 até às 23h00 🕙.

Se você tiver alguma dúvida ou precisar de assistência recomendamos que entre em contato conosco novamente amanhã a partir das 🕙 10h00, quando retomaremos nossas atividades. 🏍️

Agradecemos pela compreensão.`);
                }
            }
        }

        // Executar outras funções de middleware
        listarentregasequantidade(msg, client);
        listartodosclientescadastrados(msg, client);
        buscardadosdecadastradodaempresa(msg, client, msgNumber);
        deletarentregas(msg, client);
        deletarcliente(msg, client);
        ativarchatbot(msg, client);
        desativarchatbot(msg, client);
        listarQuantidadeDeEntregasDaEmpresa(codigotelefone, msg, client);
        excluirnumerocliente(msg, client);
    });

    client.initialize().catch(err => {
        console.error('Erro ao inicializar:', err);
    });
};

// ========== ROTAS DA API REST ==========

// Rota para enviar mensagem para número individual
app.post('/send-message', async (req, res) => {
    try {
        const { number, message } = req.body;

        if (!number || !message) {
            return res.status(400).json({
                success: false,
                error: 'Campos "number" e "message" são obrigatórios'
            });
        }

        if (!isClientReady || !canRespondToMessages) {
            return res.status(503).json({
                success: false,
                error: 'Cliente WhatsApp não está pronto. Aguarde a inicialização e o período de warmup (20s).'
            });
        }

        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        const sentMessage = await client.sendMessage(chatId, message);

        res.json({
            success: true,
            message: 'Mensagem enviada com sucesso',
            messageId: sentMessage.id.id,
            to: number
        });

    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor ao enviar mensagem',
            details: error.message
        });
    }
});

// Rota para enviar mensagem para grupo
app.post('/send-group-message', async (req, res) => {
    try {
        const { name, message } = req.body;

        if (!name || !message) {
            return res.status(400).json({
                success: false,
                error: 'Campos "name" e "message" são obrigatórios'
            });
        }

        if (!isClientReady || !canRespondToMessages) {
            return res.status(503).json({
                success: false,
                error: 'Cliente WhatsApp não está pronto. Aguarde a inicialização e o período de warmup (20s).'
            });
        }

        const chats = await client.getChats();
        const group = chats.find(chat =>
            chat.isGroup &&
            chat.name.toLowerCase().includes(name.toLowerCase())
        );

        if (!group) {
            return res.status(404).json({
                success: false,
                error: `Grupo "${name}" não encontrado`
            });
        }

        const sentMessage = await client.sendMessage(group.id._serialized, message);

        res.json({
            success: true,
            message: 'Mensagem enviada para o grupo com sucesso',
            messageId: sentMessage.id.id,
            groupName: group.name,
            groupId: group.id._serialized
        });

    } catch (error) {
        console.error('Erro ao enviar mensagem para grupo:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor ao enviar mensagem para grupo',
            details: error.message
        });
    }
});

// Rota para verificar status
app.get('/status', (req, res) => {
    res.json({
        success: true,
        clientReady: isClientReady,
        canSendMessages: canRespondToMessages,
        status: canRespondToMessages ? 'ready' : (isClientReady ? 'warmup' : 'initializing')
    });
});

// Rota principal com interface HTML
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp API + Bot</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
            width: 100%;
        }
        h1 { color: #333; margin-bottom: 10px; font-size: 28px; }
        .subtitle { color: #666; margin-bottom: 30px; font-size: 14px; }
        #qr-container {
            background: #f5f5f5;
            border-radius: 15px;
            padding: 20px;
            margin: 20px 0;
            min-height: 300px;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        #qrcode { max-width: 100%; height: auto; border-radius: 10px; }
        .status {
            padding: 12px 24px;
            border-radius: 25px;
            font-weight: 500;
            font-size: 14px;
            margin-top: 20px;
            display: inline-block;
        }
        .status.waiting { background: #fff3cd; color: #856404; }
        .status.authenticated { background: #d4edda; color: #155724; }
        .status.ready { background: #d1ecf1; color: #0c5460; }
        .status.error { background: #f8d7da; color: #721c24; }
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            vertical-align: middle;
            margin-right: 10px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .info {
            background: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
            text-align: left;
        }
        .info-title { font-weight: 600; color: #1976D2; margin-bottom: 8px; }
        .info-text { color: #555; font-size: 13px; line-height: 1.6; }
        .success-icon {
            font-size: 64px;
            color: #28a745;
            animation: checkmark 0.5s ease-in-out;
        }
        @keyframes checkmark {
            0% { transform: scale(0); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>WhatsApp API + Bot 🤖</h1>
        <p class="subtitle">API REST + Automação de Mensagens</p>

        <div id="qr-container">
            <div class="loading"></div>
        </div>

        <div id="status" class="status waiting">
            Aguardando QR Code...
        </div>

        <div class="info">
            <div class="info-title">Como conectar:</div>
            <div class="info-text">
                1. Abra o WhatsApp no seu celular<br>
                2. Toque em Menu ou Configurações<br>
                3. Toque em Aparelhos conectados<br>
                4. Toque em Conectar um aparelho<br>
                5. Aponte seu celular para esta tela para escanear o QR Code
            </div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const qrContainer = document.getElementById('qr-container');
        const statusDiv = document.getElementById('status');

        socket.on('qr', (qrData) => {
            qrContainer.innerHTML = '<img id="qrcode" src="' + qrData + '" alt="QR Code">';
            statusDiv.textContent = 'Escaneie o QR Code';
            statusDiv.className = 'status waiting';
        });

        socket.on('authenticated', () => {
            statusDiv.textContent = 'Autenticado com sucesso!';
            statusDiv.className = 'status authenticated';
            qrContainer.innerHTML = '<div class="success-icon">✓</div>';
        });

        socket.on('warmup_started', (data) => {
            let secondsLeft = Math.floor(data.duration / 1000);
            statusDiv.textContent = 'Carregando histórico... (' + secondsLeft + 's)';
            statusDiv.className = 'status waiting';

            const countdown = setInterval(() => {
                secondsLeft--;
                if (secondsLeft > 0) {
                    statusDiv.textContent = 'Carregando histórico... (' + secondsLeft + 's)';
                } else {
                    clearInterval(countdown);
                }
            }, 1000);
        });

        socket.on('warmup_completed', (data) => {
            statusDiv.textContent = data.message;
            statusDiv.className = 'status ready';
        });

        socket.on('loading', (data) => {
            statusDiv.textContent = 'Carregando... ' + data.percent + '%';
            statusDiv.className = 'status waiting';
        });

        socket.on('auth_failure', (msg) => {
            statusDiv.textContent = 'Falha na autenticação';
            statusDiv.className = 'status error';
            qrContainer.innerHTML = '<div style="color: #dc3545; font-size: 48px;">✗</div>';
        });

        socket.on('disconnected', (reason) => {
            statusDiv.textContent = 'Desconectado: ' + reason;
            statusDiv.className = 'status error';
        });
    </script>
</body>
</html>
    `);
});

// ========== INICIAR SERVIDOR ==========
server.listen(PORT, () => {
    console.log(`╔═══════════════════════════════════════════════════════════╗`);
    console.log(`║  Servidor rodando na porta ${PORT}                         ║`);
    console.log(`╚═══════════════════════════════════════════════════════════╝`);
    console.log(`🌐 Interface Web: http://localhost:${PORT}`);
    console.log(`📡 API Endpoints:`);
    console.log(`   POST http://localhost:${PORT}/send-message`);
    console.log(`   POST http://localhost:${PORT}/send-group-message`);
    console.log(`   GET  http://localhost:${PORT}/status`);
    console.log('═'.repeat(63));
    console.log('✅ API REST: Habilitada');
    console.log('✅ Bot Automático: Habilitado');
    console.log('✅ Lógica de Negócio: Ativa');
    console.log('═'.repeat(63));
    console.log('🚀 Inicializando cliente WhatsApp...');
    initializeClient();
});
