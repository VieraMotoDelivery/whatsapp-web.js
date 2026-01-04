const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('./index.js');
const qrcode = require('qrcode-terminal');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 7005;

app.use(express.json());

let client;
let isClientReady = false;
let canRespondToMessages = false;
let warmupTimeout = null;

// Rastreamento de mensagens para evitar duplicatas
const processedMessages = new Map();
const MESSAGE_CACHE_TIME = 300000; // 5 minutos
const WARMUP_PERIOD = 20000; // 20 segundos

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║         BOT WHATSAPP COM EXPRESS - INICIADO              ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('⏰ Started at:', new Date().toISOString());
console.log('═'.repeat(63));

// Verifica se mensagem já foi processada
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

// Limpeza periódica de mensagens antigas
function cleanupOldEntries() {
    const now = Date.now();
    for (const [msgId, processedAt] of processedMessages.entries()) {
        if (now - processedAt > MESSAGE_CACHE_TIME) {
            processedMessages.delete(msgId);
        }
    }
}

setInterval(cleanupOldEntries, 600000); // Limpa a cada 10 minutos

const initializeClient = () => {
    console.log('🔄 Inicializando cliente WhatsApp...');

    client = new Client({
        authStrategy: new LocalAuth({
            clientId: 'bot-server'
        }),
        puppeteer: {
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        }
    });

    // Evento QR Code
    client.on('qr', async (qr) => {
        console.log('📱 QR Code gerado. Escaneie com seu WhatsApp:');
        qrcode.generate(qr, {small: true});

        const qrDataURL = await QRCode.toDataURL(qr);
        io.emit('qr', qrDataURL);
    });

    // Evento de autenticação
    client.on('authenticated', () => {
        console.log('✅ Cliente autenticado com sucesso!');
        io.emit('authenticated');
    });

    // Evento de cliente pronto
    client.on('ready', () => {
        console.log('✅ Cliente WhatsApp pronto!');
        isClientReady = true;
        canRespondToMessages = false;

        io.emit('warmup_started', {
            message: 'Carregando histórico de mensagens, aguarde...',
            duration: WARMUP_PERIOD
        });

        if (warmupTimeout) {
            clearTimeout(warmupTimeout);
        }

        // Período de aquecimento para evitar responder mensagens antigas
        warmupTimeout = setTimeout(() => {
            canRespondToMessages = true;
            console.log('✅ Sistema pronto! Bot operacional.');
            io.emit('warmup_completed', { message: '✅ Sistema pronto! Bot operacional.' });
        }, WARMUP_PERIOD);
    });

    // Evento de falha de autenticação
    client.on('auth_failure', (msg) => {
        console.error('❌ Falha na autenticação:', msg);
        io.emit('auth_failure', msg);
    });

    // Evento de desconexão
    client.on('disconnected', (reason) => {
        console.log('⚠️ Cliente desconectado:', reason);
        isClientReady = false;
        canRespondToMessages = false;

        if (warmupTimeout) {
            clearTimeout(warmupTimeout);
            warmupTimeout = null;
        }

        io.emit('disconnected', reason);

        // Reconectar automaticamente se não foi logout
        if (reason !== 'LOGOUT') {
            console.log('🔄 Tentando reconectar em 5 segundos...');
            setTimeout(() => {
                client.initialize();
            }, 5000);
        } else {
            console.log('🚫 Logout detectado - não vai reconectar automaticamente');
        }
    });

    // Evento de loading
    client.on('loading_screen', (percent, message) => {
        console.log('Carregando:', percent, '%');
        io.emit('loading', { percent, message });
    });

    // ========== LÓGICA DO BOT - RESPOSTA A MENSAGENS ==========
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

        // ========== AQUI COMEÇA A LÓGICA DE RESPOSTA DO BOT ==========

        const message = msg.body.toLowerCase();

        // Exemplo 1: Comando !ping
        if (message === '!ping') {
            await msg.reply('pong 🏓');
            return;
        }

        // Exemplo 2: Comando !oi ou olá
        if (message === '!oi' || message === 'oi' || message === 'olá' || message === 'ola') {
            await msg.reply(`Olá! 😃 Bem-vindo ao nosso atendimento.

Como posso ajudar você hoje?

Digite:
*1* - Para informações
*2* - Para suporte
*3* - Para falar com atendente`);
            return;
        }

        // Exemplo 3: Resposta para opção 1
        if (message === '1') {
            await msg.reply(`📋 *Informações*

Aqui estão algumas informações úteis sobre nossos serviços.

Digite *menu* para voltar ao início.`);
            return;
        }

        // Exemplo 4: Resposta para opção 2
        if (message === '2') {
            await msg.reply(`🛠️ *Suporte Técnico*

Nossa equipe de suporte está disponível para ajudá-lo.

Digite *menu* para voltar ao início.`);
            return;
        }

        // Exemplo 5: Resposta para opção 3
        if (message === '3') {
            await msg.reply(`👤 *Atendimento Humano*

Em breve um de nossos atendentes entrará em contato.

Digite *menu* para voltar ao início.`);
            return;
        }

        // Exemplo 6: Comando menu
        if (message === 'menu') {
            await msg.reply(`*Menu Principal* 🏠

Digite:
*1* - Para informações
*2* - Para suporte
*3* - Para falar com atendente

Ou envie *!ping* para testar a conexão.`);
            return;
        }

        // Exemplo 7: Verificar horário de atendimento
        const date = new Date();
        const hour = date.getHours();

        // Se receber qualquer outra mensagem fora do horário comercial
        if (hour < 9 || hour >= 18) {
            await msg.reply(`⏰ *Fora do horário de atendimento*

Nosso horário de funcionamento é:
Segunda a Sexta: 09h00 às 18h00

Por favor, retorne durante nosso horário de atendimento.
Obrigado! 😊`);
            return;
        }

        // Resposta padrão para mensagens não reconhecidas
        await msg.reply(`Desculpe, não entendi sua mensagem. 🤔

Digite *menu* para ver as opções disponíveis.`);

        // ========== FIM DA LÓGICA DE RESPOSTA DO BOT ==========
    });

    client.initialize();
};

// ========== ROTAS DA API ==========

// Rota para enviar mensagem para número
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

        // Formatar número (adicionar @c.us se não tiver)
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

        // Buscar o grupo pelo nome
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
    <title>WhatsApp Bot - QR Code</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

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

        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }

        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }

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

        #qrcode {
            max-width: 100%;
            height: auto;
            border-radius: 10px;
        }

        .status {
            padding: 12px 24px;
            border-radius: 25px;
            font-weight: 500;
            font-size: 14px;
            margin-top: 20px;
            display: inline-block;
        }

        .status.waiting {
            background: #fff3cd;
            color: #856404;
        }

        .status.authenticated {
            background: #d4edda;
            color: #155724;
        }

        .status.ready {
            background: #d1ecf1;
            color: #0c5460;
        }

        .status.error {
            background: #f8d7da;
            color: #721c24;
        }

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

        .info-title {
            font-weight: 600;
            color: #1976D2;
            margin-bottom: 8px;
        }

        .info-text {
            color: #555;
            font-size: 13px;
            line-height: 1.6;
        }

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
        <h1>WhatsApp Bot 🤖</h1>
        <p class="subtitle">Escaneie o QR Code para conectar</p>

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
            console.log('QR Code recebido');
            qrContainer.innerHTML = '<img id="qrcode" src="' + qrData + '" alt="QR Code">';
            statusDiv.textContent = 'Escaneie o QR Code';
            statusDiv.className = 'status waiting';
        });

        socket.on('authenticated', () => {
            console.log('Autenticado');
            statusDiv.textContent = 'Autenticado com sucesso!';
            statusDiv.className = 'status authenticated';
            qrContainer.innerHTML = '<div class="success-icon">✓</div>';
        });

        socket.on('warmup_started', (data) => {
            console.log('Aquecimento iniciado:', data);
            let secondsLeft = Math.floor(data.duration / 1000);
            statusDiv.textContent = 'Carregando histórico de mensagens, aguarde... (' + secondsLeft + 's)';
            statusDiv.className = 'status waiting';

            const countdown = setInterval(() => {
                secondsLeft--;
                if (secondsLeft > 0) {
                    statusDiv.textContent = 'Carregando histórico de mensagens, aguarde... (' + secondsLeft + 's)';
                } else {
                    clearInterval(countdown);
                }
            }, 1000);
        });

        socket.on('warmup_completed', (data) => {
            console.log('Aquecimento concluído:', data);
            statusDiv.textContent = data.message;
            statusDiv.className = 'status ready';
        });

        socket.on('loading', (data) => {
            console.log('Carregando:', data.percent + '%');
            statusDiv.textContent = 'Carregando... ' + data.percent + '%';
            statusDiv.className = 'status waiting';
        });

        socket.on('auth_failure', (msg) => {
            console.error('Falha na autenticação:', msg);
            statusDiv.textContent = 'Falha na autenticação';
            statusDiv.className = 'status error';
            qrContainer.innerHTML = '<div style="color: #dc3545; font-size: 48px;">✗</div>';
        });

        socket.on('disconnected', (reason) => {
            console.log('Desconectado:', reason);
            statusDiv.textContent = 'Desconectado: ' + reason;
            statusDiv.className = 'status error';
        });
    </script>
</body>
</html>
    `);
});

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`╔═══════════════════════════════════════════════════════════╗`);
    console.log(`║  Servidor rodando na porta ${PORT}                         ║`);
    console.log(`╚═══════════════════════════════════════════════════════════╝`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
    console.log(`📡 API Endpoints:`);
    console.log(`   POST http://localhost:${PORT}/send-message`);
    console.log(`   POST http://localhost:${PORT}/send-group-message`);
    console.log(`   GET  http://localhost:${PORT}/status`);
    console.log('═'.repeat(63));
    console.log('🚀 Inicializando cliente WhatsApp...');
    initializeClient();
});
