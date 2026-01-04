# 🚂 Deploy no Railway - Guia Completo

Este guia explica como fazer deploy do WhatsApp API + Bot no Railway.

## ⚠️ IMPORTANTE: Sessão WhatsApp no Railway

**ATENÇÃO**: A cada deploy/restart no Railway, a sessão do WhatsApp é perdida porque o Railway não persiste arquivos entre deploys. Você precisará:

1. Escanear o QR Code novamente após cada deploy
2. OU implementar armazenamento persistente (MongoDB, PostgreSQL, S3)

## 📋 Pré-requisitos

1. Conta no GitHub (você já tem)
2. Conta no Railway (gratuita) - https://railway.app
3. Repositório no GitHub (já criado)

## 🚀 Passo a Passo para Deploy

### 1. Criar Projeto no Railway

1. Acesse https://railway.app
2. Faça login com GitHub
3. Clique em **"New Project"**
4. Selecione **"Deploy from GitHub repo"**
5. Autorize o Railway a acessar seus repositórios
6. Selecione o repositório: `VieraMotoDelivery/whatsapp-web.js`

### 2. Configurar Variáveis de Ambiente (Opcional)

No painel do Railway, vá em **Variables** e adicione:

```
NODE_ENV=production
PORT=7005
```

**Nota**: O Railway detecta automaticamente a porta, mas você pode definir se preferir.

### 3. Build Command

O Railway detecta automaticamente o `package.json` e roda `npm install`.

### 4. Start Command

Certifique-se que o `package.json` tem:

```json
"scripts": {
  "start": "node server.js"
}
```

**✅ Já está configurado no seu projeto!**

### 5. Deploy

O Railway fará deploy automaticamente. Aguarde alguns minutos.

## 🔍 Verificar Deploy

### 1. Ver Logs

No painel do Railway:
- Clique na aba **"Deployments"**
- Clique no deployment ativo
- Veja os logs em tempo real

**Procure por:**
```
╔═══════════════════════════════════════════════════════════╗
║     SERVIDOR WHATSAPP API + BOT - INICIADO               ║
╚═══════════════════════════════════════════════════════════╝
📍 AMBIENTE: PRODUÇÃO (Railway)
🖥️  Modo headless: true (sem interface)
```

### 2. Acessar a Interface Web

1. No Railway, vá em **"Settings"** > **"Networking"**
2. Clique em **"Generate Domain"**
3. O Railway vai criar um domínio tipo: `seu-projeto.up.railway.app`
4. Acesse esse domínio no navegador
5. **O QR Code aparecerá na tela!**

## 📱 Escanear QR Code no Railway

### Via Interface Web

1. Acesse `https://seu-projeto.up.railway.app`
2. O QR Code aparece na tela
3. Escaneie com WhatsApp
4. Aguarde 20 segundos (warmup)
5. Pronto!

### Via Logs (Terminal)

Se o QR Code não aparecer na web:

1. Vá nos **Logs** do Railway
2. Procure por linhas como:
```
📱 QR Code gerado. Escaneie com seu WhatsApp:
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ ▄▄▄▄▄ █▀█ ▀▀██▄   ▄▄ ▀▄▄▄ █ ...
```
3. O QR Code ASCII estará nos logs
4. Você pode usar um app de QR Code scanner ou copiar para um gerador de QR Code online

## 🌐 Testar a API

Depois de escanear o QR Code, teste os endpoints:

### Verificar Status

```bash
curl https://seu-projeto.up.railway.app/status
```

**Resposta esperada:**
```json
{
  "success": true,
  "clientReady": true,
  "canSendMessages": true,
  "status": "ready"
}
```

### Enviar Mensagem

```bash
curl -X POST https://seu-projeto.up.railway.app/send-message \
  -H "Content-Type: application/json" \
  -d '{"number": "5511999999999", "message": "Teste do Railway!"}'
```

## 🔧 Configurações Adicionais

### Desabilitar Sleep Mode (Plano Grátis)

No plano gratuito do Railway, o serviço "dorme" após 5 minutos de inatividade.

**Solução temporária:**
Use um serviço como UptimeRobot ou Cron-Job.org para fazer ping a cada 5 minutos:

```
GET https://seu-projeto.up.railway.app/status
```

**Solução permanente:**
Upgrade para plano pago ($5/mês)

### Aumentar Timeout

Se o WhatsApp demorar para conectar, adicione esta variável de ambiente:

```
PUPPETEER_TIMEOUT=60000
```

## ⚠️ Problemas Comuns

### 1. QR Code não aparece na interface

**Solução**: Veja o QR Code nos logs do Railway (aba Deployments > Logs)

### 2. "Missing X server" error

**Solução**: Já está corrigido! O código detecta Railway automaticamente e usa `headless: true`

### 3. Sessão perdida após restart

**Problema**: Railway não persiste arquivos `.wwebjs_auth/`

**Soluções**:

**A) Usar MongoDB Atlas (Recomendado)**

1. Crie conta grátis no MongoDB Atlas
2. Instale o pacote:
```bash
npm install mongodb-remote-auth
```

3. Modifique `server.js`:
```javascript
const { MongoStore } = require('mongodb-remote-auth');

authStrategy: new RemoteAuth({
    store: new MongoStore({
        uri: process.env.MONGODB_URI,
        database: 'whatsapp'
    }),
    backupSyncIntervalMs: 300000
})
```

4. Adicione variável de ambiente no Railway:
```
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/
```

**B) Usar PostgreSQL do Railway**

1. No Railway, adicione um serviço PostgreSQL
2. Use a biblioteca `pg` para armazenar sessão

### 4. Erro "Protocol error"

Adicione mais argumentos ao Puppeteer em `server.js`:

```javascript
args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
    '--single-process',  // Adicione isto
    '--no-first-run',
    '--no-zygote'
]
```

### 5. Out of Memory

Railway tem limite de memória. Adicione variável:

```
NODE_OPTIONS=--max_old_space_size=2048
```

## 📊 Monitoramento

### Ver Logs em Tempo Real

```bash
railway logs --service whatsapp-web
```

### Ver Métricas

No painel do Railway:
- CPU Usage
- Memory Usage
- Network

## 🔄 Redeploy

Sempre que você fizer push no GitHub:

```bash
git add .
git commit -m "Sua mensagem"
git push
```

O Railway fará redeploy automaticamente!

## 🎯 Checklist Final

- [ ] Deploy realizado com sucesso
- [ ] Logs mostram "SERVIDOR WHATSAPP API + BOT - INICIADO"
- [ ] Domínio público gerado
- [ ] QR Code aparece na interface ou nos logs
- [ ] QR Code escaneado com sucesso
- [ ] Status retorna "ready"
- [ ] Mensagem de teste enviada com sucesso
- [ ] (Opcional) MongoDB configurado para persistir sessão
- [ ] (Opcional) UptimeRobot configurado para evitar sleep

## 📞 Seu Link de Produção

Após configurar tudo, seu link será:

```
https://viera-chatbot.up.railway.app/
```

**Endpoints disponíveis:**
- Interface: `https://viera-chatbot.up.railway.app/`
- Status: `https://viera-chatbot.up.railway.app/status`
- Enviar mensagem: `POST https://viera-chatbot.up.railway.app/send-message`
- Enviar para grupo: `POST https://viera-chatbot.up.railway.app/send-group-message`

## 🆘 Suporte

Se tiver problemas:

1. Verifique os logs no Railway
2. Teste localmente com `npm start`
3. Verifique se todas as variáveis de ambiente estão configuradas
4. Abra uma issue no GitHub

---

**Desenvolvido por VieraMotoDelivery**
- Email: vieiramdelivery@gmail.com
- GitHub: [@VieraMotoDelivery](https://github.com/VieraMotoDelivery)
