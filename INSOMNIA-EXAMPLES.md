# 📡 Exemplos de Requisições para Insomnia

Este arquivo contém exemplos de requisições HTTP para testar as APIs do WhatsApp Bot.

## 🔧 Configuração Inicial

**Base URL**: `http://localhost:7005`

**Porta**: 7005 (ou a porta definida na variável de ambiente PORT)

---

## 📨 1. Enviar Mensagem para Número Individual

### Endpoint
```
POST http://localhost:7005/send-message
```

### Headers
```
Content-Type: application/json
```

### Body (JSON)
```json
{
  "number": "5511999999999",
  "message": "Olá! Esta é uma mensagem de teste enviada via API."
}
```

### Observações
- O número pode ser enviado com ou sem `@c.us` (será adicionado automaticamente se não tiver)
- Use o código do país + DDD + número (sem espaços ou caracteres especiais)
- Exemplo: `5511999999999` (Brasil - SP - 999999999)

### Resposta de Sucesso (200)
```json
{
  "success": true,
  "message": "Mensagem enviada com sucesso",
  "messageId": "ABC123XYZ",
  "to": "5511999999999"
}
```

### Possíveis Erros

**400 - Bad Request**
```json
{
  "success": false,
  "error": "Campos \"number\" e \"message\" são obrigatórios"
}
```

**503 - Service Unavailable**
```json
{
  "success": false,
  "error": "Cliente WhatsApp não está pronto. Aguarde a inicialização e o período de warmup (20s)."
}
```

**500 - Internal Server Error**
```json
{
  "success": false,
  "error": "Erro interno do servidor ao enviar mensagem",
  "details": "Detalhes do erro..."
}
```

---

## 👥 2. Enviar Mensagem para Grupo

### Endpoint
```
POST http://localhost:7005/send-group-message
```

### Headers
```
Content-Type: application/json
```

### Body (JSON)
```json
{
  "name": "Meu Grupo",
  "message": "Olá pessoal! Mensagem enviada via API para o grupo."
}
```

### Observações
- O campo `name` busca grupos que **contenham** esse texto no nome (case-insensitive)
- Exemplo: se o grupo se chama "Grupo de Trabalho", você pode buscar por "trabalho", "Grupo", etc.
- O bot deve estar participando do grupo para poder enviar mensagens

### Resposta de Sucesso (200)
```json
{
  "success": true,
  "message": "Mensagem enviada para o grupo com sucesso",
  "messageId": "ABC123XYZ",
  "groupName": "Meu Grupo",
  "groupId": "123456789@g.us"
}
```

### Possíveis Erros

**400 - Bad Request**
```json
{
  "success": false,
  "error": "Campos \"name\" e \"message\" são obrigatórios"
}
```

**404 - Not Found**
```json
{
  "success": false,
  "error": "Grupo \"Nome do Grupo\" não encontrado"
}
```

**503 - Service Unavailable**
```json
{
  "success": false,
  "error": "Cliente WhatsApp não está pronto. Aguarde a inicialização e o período de warmup (20s)."
}
```

---

## ✅ 3. Verificar Status do Cliente

### Endpoint
```
GET http://localhost:7005/status
```

### Headers
Nenhum header necessário

### Resposta (200)
```json
{
  "success": true,
  "clientReady": true,
  "canSendMessages": true,
  "status": "ready"
}
```

### Possíveis Status
- `"initializing"` - Cliente está sendo inicializado
- `"warmup"` - Cliente autenticado mas em período de aquecimento (20s)
- `"ready"` - Cliente pronto para enviar mensagens

---

## 🏠 4. Interface Web (QR Code)

### Endpoint
```
GET http://localhost:7005/
```

Acesse no navegador: `http://localhost:7005`

Esta página exibe:
- QR Code para autenticação
- Status da conexão em tempo real
- Instruções de como conectar

---

## 📝 Exemplos de Uso em Diferentes Cenários

### Cenário 1: Notificação Automática
```json
POST http://localhost:7005/send-message
{
  "number": "5511999999999",
  "message": "🔔 Notificação: Seu pedido #12345 foi enviado!"
}
```

### Cenário 2: Alerta para Grupo de Suporte
```json
POST http://localhost:7005/send-group-message
{
  "name": "Suporte Técnico",
  "message": "⚠️ URGENTE: Sistema com instabilidade detectada às 14:30"
}
```

### Cenário 3: Mensagem de Boas-vindas
```json
POST http://localhost:7005/send-message
{
  "number": "5511888888888",
  "message": "Olá! 😃 Bem-vindo ao nosso serviço.\n\nEstamos aqui para ajudar você!"
}
```

### Cenário 4: Mensagem com Formatação
```json
POST http://localhost:7005/send-message
{
  "number": "5511777777777",
  "message": "*Título em Negrito*\n\n_Texto em Itálico_\n\n~Texto Tachado~\n\n```Código```"
}
```

---

## ⏱️ Fluxo de Inicialização

1. **Servidor inicia** → Status: `initializing`
2. **QR Code gerado** → Escanear com WhatsApp
3. **Autenticação bem-sucedida** → Status: `warmup`
4. **Aguardar 20 segundos** → Período de aquecimento
5. **Sistema pronto** → Status: `ready` ✅

Após o status `ready`, você pode enviar mensagens via API!

---

## 🔍 Dicas de Troubleshooting

### Erro 503 - Cliente não está pronto
- Verifique o status com `GET /status`
- Aguarde o período de warmup (20 segundos após autenticação)
- Certifique-se de que escaneou o QR Code

### Grupo não encontrado (404)
- Verifique se o nome está correto
- Certifique-se de que o bot está no grupo
- Tente usar apenas parte do nome do grupo

### Número inválido
- Use formato internacional: código do país + DDD + número
- Remova espaços, parênteses e hífens
- Exemplo correto: `5511999999999`

---

## 🎯 Collection do Insomnia

Você pode importar esta collection no Insomnia:

```json
{
  "name": "WhatsApp Bot API",
  "requests": [
    {
      "name": "1. Verificar Status",
      "method": "GET",
      "url": "http://localhost:7005/status"
    },
    {
      "name": "2. Enviar Mensagem Individual",
      "method": "POST",
      "url": "http://localhost:7005/send-message",
      "headers": [
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ],
      "body": {
        "mimeType": "application/json",
        "text": "{\n  \"number\": \"5511999999999\",\n  \"message\": \"Olá! Teste de mensagem.\"\n}"
      }
    },
    {
      "name": "3. Enviar Mensagem para Grupo",
      "method": "POST",
      "url": "http://localhost:7005/send-group-message",
      "headers": [
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ],
      "body": {
        "mimeType": "application/json",
        "text": "{\n  \"name\": \"Meu Grupo\",\n  \"message\": \"Mensagem para o grupo!\"\n}"
      }
    }
  ]
}
```

---

## ✨ Recursos Adicionais

### Mensagens com Quebra de Linha
Use `\n` para quebrar linhas:
```json
{
  "message": "Linha 1\nLinha 2\nLinha 3"
}
```

### Emojis
Suporta todos os emojis Unicode:
```json
{
  "message": "Olá! 😃 Tudo bem? 👋"
}
```

### Markdown do WhatsApp
- `*negrito*` → **negrito**
- `_itálico_` → _itálico_
- `~tachado~` → ~~tachado~~
- ` ```código``` ` → `código`

---

**Pronto para usar! 🚀**
