const { Client, LocalAuth } = require('./index');
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

const client = new Client({
    authStrategy: new LocalAuth(),
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

console.log('Inicializando WhatsApp Web...');

client.on('loading_screen', (percent, message) => {
    console.log('CARREGANDO:', percent, message);
});

client.on('qr', (qr) => {
    console.log('QR CODE RECEBIDO!');
    console.log('Escaneie este QR code com seu WhatsApp:');
    console.log(qr);
});

client.on('code', (code) => {
    console.log('Código de pareamento:', code);
});

client.on('authenticated', () => {
    console.log('AUTENTICADO COM SUCESSO!');
});

client.on('auth_failure', msg => {
    console.error('FALHA NA AUTENTICAÇÃO:', msg);
});

client.on('ready', async () => {
    console.log('CLIENTE PRONTO!');
    const version = await client.getWWebVersion();
    console.log('Versão do WhatsApp Web:', version);
});

client.on('message', async msg => {
    // console.log('MESSAGE RECEIVED', msg.number);

    if (shouldBlockMessage(msg.from, msg.body)) {
        console.log(`Mensagem bloqueada de ${msg.from}: "${msg.body}"`);
        return;
    }

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

client.on('disconnected', (reason) => {
    console.log('Cliente desconectado:', reason);
});

client.initialize().catch(err => {
    console.error('Erro ao inicializar:', err);
});
