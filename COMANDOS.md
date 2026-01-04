# 📖 GUIA COMPLETO DE COMANDOS - Viera Entregas Bot

Documentação completa de todos os comandos disponíveis no sistema de chatbot para entregas.

---

## 📋 ÍNDICE

1. [Comandos para Clientes Pessoa Física](#-comandos-para-pessoa-física-sem-código-cadastrado)
2. [Comandos para Empresas Cadastradas](#-comandos-para-empresas-com-código-cadastrado)
3. [Comandos de Cadastro de Clientes](#-comandos-de-cadastro)
4. [Comandos Administrativos](#-comandos-administrativos)
5. [Comandos de Consulta](#-comandos-de-consulta)
6. [Comandos de Controle do Bot](#-comandos-de-controle-do-bot)
7. [Comandos Auxiliares](#-comandos-auxiliares)

---

## 👤 COMANDOS PARA PESSOA FÍSICA (Sem código cadastrado)

### Menu Inicial

Quando um número **NÃO cadastrado** envia uma mensagem, o bot oferece:

```
1 - Solicitar um motoboy para fazer um pedido de entrega / ou consultar valores
2 - Falar com um representante sobre vaga de emprego, parceria ou outros assuntos
```

### Opção 1: Solicitar Entrega

Após escolher **1**, o bot mostra as tarifas:

```
1 - Barra x Barra (R$ 9,00)
2 - Barra x Igaraçu (R$ 10,00)
3 - Cohab da Barra pra cima x Igaraçu (R$ 14,00)
4 - Igaraçu x Igaraçu (R$ 8,00)
5 - Igaraçu x Barra (R$ 10,00)
6 - Igaraçu x Cohab da Barra pra cima (R$ 14,00)
7 - Áreas Rurais, chácaras e condomínio (Solicitar Consulta)
```

**Fluxo da Opção 1 a 6:**
1. Escolher rota (1-6)
2. Digitar endereço de COLETA (rua, número, cidade - tudo na mesma linha)
3. Digitar endereço de ENTREGA (rua, número, cidade - tudo na mesma linha)
4. Escolher forma de pagamento:
   - `1` - Produto pago + entrega em Pix
   - `2` - Produto pago + entrega em dinheiro
   - `3` - Produto a pagar via motoboy + entrega em dinheiro
   - `4` - Produto a pagar via motoboy + entrega em Pix
5. Adicionar observações (telefone, ponto de referência, etc)
6. Pedido finalizado!

**Fluxo da Opção 7 (Áreas Rurais):**
1. Escolher `7`
2. Digitar endereço de COLETA
3. Digitar endereço de ENTREGA
4. Aguardar consulta de valor
5. Confirmar se deseja continuar:
   - `1` - Sim, continuar
   - `2` - Não
6. Se sim, escolher forma de pagamento
7. Adicionar observações
8. Pedido finalizado!

### Opção 2: Falar com Representante

- Desativa o chatbot temporariamente
- Notifica representante para atendimento humano

---

## 🏢 COMANDOS PARA EMPRESAS (Com código cadastrado)

### Fazer Pedido de Entrega

**Comando:** Digite apenas o código (3 dígitos)
**Exemplo:** `255`

**Fluxo:**
1. Digitar código (ex: `255`)
2. Bot confirma nome da empresa
3. Digitar endereço de ENTREGA (rua, número, cidade - tudo na mesma linha)
4. Escolher forma de pagamento:
   - `1` - Cartão
   - `2` - Dinheiro
   - `3` - Pago, Pix, Pagamento online
5. Adicionar observações
6. Pedido é lançado automaticamente no sistema Foody Delivery
7. Recebe confirmação com número do pedido

**Observações:**
- O endereço de coleta é detectado automaticamente pelo token cadastrado
- Apenas números de telefone cadastrados podem fazer pedidos
- O pedido é integrado com o sistema Foody Delivery

### Ver Dados do Cadastro

**Comando:** `CÓDIGO/dados`
**Exemplo:** `255/dados`

**Retorna:**
- Código da empresa
- Nome
- Token
- Telefone 1 a 5 (todos cadastrados)

---

## 🆕 COMANDOS DE CADASTRO

### 1. Registrar Novo Cliente (Código)

**Comando:** `/registrar/.`

**Fluxo:**
1. Digite `/registrar/.`
2. Digite o código (3 dígitos)
3. Digite o nome do cliente
4. Cliente cadastrado com sucesso!

**Para que serve:**
- Criar um novo cliente no sistema
- Gerar código único para a empresa
- Código será usado para fazer pedidos

---

### 2. Completar Cadastro do Cliente

**Comando:** `CÓDIGO/registrar`
**Exemplo:** `255/registrar`

**Opções após comando:**
```
1 - Quero cadastrar o token
2 - Quero cadastrar ou editar os números de WhatsApp
```

#### Opção 1: Cadastrar Token

**Fluxo:**
1. Digite `1`
2. Cole o token (mais de 30 caracteres)
3. Escolha se já cadastrou telefones:
   - `1` - Já cadastrei
   - `2` - Ainda não cadastrei
4. Se `2`, segue para cadastro de telefones

**O que é o token:**
- Token do Foody Delivery
- Identifica o ponto de coleta
- Essencial para integração com sistema de entregas

#### Opção 2: Cadastrar Telefones

**Fluxo:**
1. Digite `2`
2. Digite primeiro número (10 ou 11 dígitos, com DDD)
3. Exemplo: `14981574852`
4. Bot pergunta se quer cadastrar mais números
5. Digite `1` para não cadastrar mais, OU digite outro número
6. Pode cadastrar até 5 números
7. Bot pergunta se já cadastrou token:
   - `1` - Já cadastrei
   - `2` - Ainda não cadastrei
8. Cadastro finalizado!

**Regras:**
- Números devem ter 10 ou 11 dígitos
- Incluir DDD
- Máximo de 5 números por cliente
- Apenas números cadastrados podem fazer pedidos

---

## 🔧 COMANDOS ADMINISTRATIVOS

### 1. Deletar Todas as Entregas

**Comando:** `deletar/entregas`

**Para que serve:**
- Remove todas as entregas do banco de dados
- Use com cuidado! Ação irreversível

---

### 2. Deletar Cliente

**Comando:** `deletar/cliente/XXX`
**Exemplo:** `deletar/cliente/255`

**Para que serve:**
- Remove cliente do banco de dados
- Substitua XXX pelo código do cliente (3 dígitos)
- Ação irreversível

---

### 3. Excluir Número de Telefone do Cliente

**Comando:** `XXX/excluir/numero/X`
**Exemplos:**
- `255/excluir/numero/1` - Exclui telefone 1
- `255/excluir/numero/2` - Exclui telefone 2
- `255/excluir/numero/5` - Exclui telefone 5

**Para que serve:**
- Remove um número de telefone específico do cadastro
- XXX = código da empresa (3 dígitos)
- X = posição do telefone (1, 2, 3, 4 ou 5)

**Resposta:**
- Sucesso: "Numero excluido com sucesso!"
- Erro: "Codigo da empresa não encontrado."

---

## 📊 COMANDOS DE CONSULTA

### 1. Listar Clientes Cadastrados

**Comando:** `listar/clientes`

**Retorna:**
```
----------------------
Código: 255
Nome: Pizzaria Bella
Telefone 1: 5514981111111
Telefone 2: 5514982222222
Telefone 3: Sem registro
Telefone 4: Sem registro
Telefone 5: Sem registro
----------------------
...
Quantidade de clientes cadastrados: 15
```

**Para que serve:**
- Ver todos os clientes cadastrados
- Verificar códigos
- Conferir telefones cadastrados

---

### 2. Listar Entregas por Data

**Comando:** `listar/entregas/MMDD`
**Exemplos:**
- `listar/entregas/0104` - Lista entregas de 01/04
- `listar/entregas/1225` - Lista entregas de 25/12

**Retorna:**
```
Data: /0104
Quantidade de entregas: 25
```

**Para que serve:**
- Verificar quantas entregas foram feitas em uma data específica
- Formato: MMDD (mês com 2 dígitos + dia com 2 dígitos)

---

### 3. Listar Entregas de Uma Empresa

**Comando:** `entregas/XXX`
**Exemplo:** `entregas/255`

**Requisito:**
- Deve ser enviado por um número cadastrado nessa empresa

**Retorna:**
```
----------------------
Numero do pedido: 12345
Telefone: 14981111111
Endereço: Rua ABC, 123, Barra Bonita sp
Forma de pagamento: pix
Obs: Casa azul, portão branco
----------------------
...
Quantidade de entregas hoje: 8
```

**Para que serve:**
- Empresa ver suas próprias entregas do dia
- Acompanhar volume de pedidos
- Verificar detalhes das entregas

---

## 🎛️ COMANDOS DE CONTROLE DO BOT

### 1. Ativar Chatbot

**Comando:** `ativar/DDDNÚMERO`
**Exemplo:** `ativar/14981234567`

**Para que serve:**
- Reativar o chatbot para um número específico
- Usado após desativar manualmente
- Número volta a receber respostas automáticas

**Resposta:**
- Sucesso: "Chatbot ativado."
- Erro: "Não existe esse numero no banco de dados. Não se esqueça do ddd."

---

### 2. Desativar Chatbot

**Comando:** `desativar/DDDNÚMERO`
**Exemplo:** `desativar/14981234567`

**Para que serve:**
- Desativar chatbot para atendimento humano
- Número não receberá mais respostas automáticas
- Útil para atendimento personalizado

**Resposta:**
- Sucesso: "Chatbot desativado."
- Erro: "Não existe esse numero no banco de dados. Não se esqueça do ddd."

---

## 🔄 COMANDOS AUXILIARES

### 1. Voltar / Cancelar

**Comandos:** `voltar`, `cancela`, `cancelar`

**Para que serve:**
- Voltar ao início do fluxo
- Cancelar operação atual
- Recomeçar processo
- Funciona em qualquer etapa do cadastro ou pedido

**Resposta:**
```
Ok, errar é humano e está tudo bem 😄
Voltamos para o início para que possa refazer seu pedido.
```

---

## 📝 FORMATO DE ENDEREÇOS

### Regras para Endereços

**Formato correto:**
```
Rua ABC, 123, Barra Bonita
Av. Brasil, 456, Igaraçu do Tiete
```

**Requisitos:**
- Nome da rua/avenida
- Número da casa/estabelecimento
- Nome da cidade (Barra Bonita ou Igaraçu do Tiete)
- Tudo na mesma linha
- Mínimo 20 caracteres
- Deve conter número

**Cidades aceitas:**
- Barra Bonita
- Barra Bomita (aceita erro de digitação)
- Igaraçu do Tiete
- Igaracu do Tiete
- Igaraçu do Tietê
- Igaracu do Tietê

---

## 🕐 HORÁRIO DE ATENDIMENTO

### Horário Comercial

**10h00 às 23h00** - Bot ativo

**Fora do horário:**
- Mensagens antes das 10h: "Horário de atendimento inicia às 10h00"
- Mensagens após às 23h: "Horário de atendimento é das 10h30 até às 23h00"

---

## 💰 FORMAS DE PAGAMENTO

### Para Pessoa Física

1. Produto pago + entrega em Pix
2. Produto pago + entrega em dinheiro
3. Produto a pagar (motoboy paga) + entrega em dinheiro
4. Produto a pagar (motoboy paga) + entrega em Pix

### Para Empresas

1. Cartão
2. Dinheiro
3. Pago / Pix / Pagamento online

**Observações:**
- Não tem máquina de cartão
- Motoboy não fornece troco
- Para Pix, recebe chave CNPJ após pedido

---

## 🚨 MENSAGENS DE ERRO COMUNS

### "Digite o código corretamente"
- Código inválido ou não cadastrado
- Verifique se o código tem 3 dígitos

### "Alguma informação pode estar errada..."
- Endereço não atende os requisitos
- Falta número, nome da rua ou cidade
- Linha muito curta (menos de 20 caracteres)

### "O token está errado, copia e cole novamente"
- Token deve ter mais de 30 caracteres
- Copie e cole diretamente do Foody Delivery

### "Esse numero de telefone não é valido..."
- Número com mais de 11 dígitos
- Número com menos de 10 dígitos (falta DDD)
- Use formato: 14981234567

### "Já existe um cliente cadastrado com esse código"
- Código já está em uso
- Escolha outro código de 3 dígitos

### "Todos os campos de telefone foram preenchidos"
- Já cadastrou 5 números (limite máximo)
- Use comando de excluir se precisar substituir

---

## 🎯 EXEMPLOS PRÁTICOS

### Exemplo 1: Pessoa Física Fazendo Pedido

```
Cliente: (primeira mensagem)
Bot: Olá! Eu sou o Assistente Virtual...
     1 - Solicitar um motoboy
     2 - Falar com representante

Cliente: 1
Bot: Segue os valores...
     1 - Barra x Barra 9,00
     ...

Cliente: 4
Bot: Digite o endereço de COLETA...

Cliente: Rua das Flores, 123, Barra Bonita
Bot: Agora digite o endereço de ENTREGA...

Cliente: Av. Brasil, 456, Igaraçu do Tiete
Bot: Sobre o pagamento...
     1 - Produto pago + entrega em Pix
     ...

Cliente: 1
Bot: Tem alguma observação?

Cliente: Portão azul, ligar antes de entregar 14981111111
Bot: Obrigado, seu pedido foi feito com sucesso!
     Numero do pedido: 12345
     ...
```

### Exemplo 2: Empresa Fazendo Pedido

```
Cliente: 255
Bot: Olá Pizzaria Bella, bora fazer mais um pedido?
     Digite o endereço de ENTREGA...

Cliente: Rua ABC, 789, Barra Bonita
Bot: Qual é a forma de pagamento?
     1 - Cartão
     2 - Dinheiro
     3 - Pago, Pix, Pagamento online

Cliente: 2
Bot: Tem alguma observação?

Cliente: Casa com muro branco, cliente já pagou
Bot: Obrigado, seu pedido foi feito com sucesso!
     Numero do pedido: 12346
     ...
```

### Exemplo 3: Cadastrar Novo Cliente

```
Admin: /registrar/.
Bot: Digite o código.

Admin: 300
Bot: Digite o nome do cliente

Admin: Restaurante Bom Sabor
Bot: Cliente cadastrado com sucesso.

Admin: 300/registrar
Bot: 1 - Quero cadastrar o token
     2 - Quero cadastrar números de WhatsApp

Admin: 1
Bot: Ok, agora nos informe o token...

Admin: (cola token aqui)
Bot: Obrigado, o token foi cadastrado!
     Você já cadastrou o numero de telefone?
     1 - Já cadastrei
     2 - Ainda não cadastrei

Admin: 2
Bot: Registre todos os números...

Admin: 14981111111
Bot: Obrigado, o numero foi cadastrado!
     Quer cadastrar mais numero?
     1 - Não quero cadastrar mais

Admin: 14982222222
Bot: Obrigado, o numero foi cadastrado!
     Quer cadastrar mais numero?

Admin: 1
Bot: Você já cadastrou o token?
     1 - Já cadastrei
     2 - Ainda não cadastrei

Admin: 1
Bot: Obrigado, seu cadastro foi finalizado com sucesso!
     ...
```

---

## 📱 DICAS DE USO

1. **Sempre use DDD nos números** (ex: 14981234567)
2. **Endereços devem ser completos** (rua, número, cidade)
3. **Códigos sempre têm 3 dígitos**
4. **Token tem mais de 30 caracteres**
5. **Máximo 5 telefones por empresa**
6. **Use "voltar" para recomeçar a qualquer momento**
7. **Horário de atendimento: 10h às 23h**
8. **Observações podem ter até 300 caracteres**

---

## 🔐 PERMISSÕES

### Quem pode usar cada comando?

**Todos (pessoa física):**
- Solicitar entrega
- Falar com representante

**Apenas números cadastrados:**
- Fazer pedido com código
- Ver dados do cadastro
- Listar entregas da empresa

**Apenas administradores:**
- `/registrar/.` - Criar cliente
- `listar/clientes` - Listar todos clientes
- `deletar/entregas` - Deletar todas entregas
- `deletar/cliente/XXX` - Deletar cliente
- `ativar/NÚMERO` - Ativar chatbot
- `desativar/NÚMERO` - Desativar chatbot
- `XXX/excluir/numero/X` - Excluir telefone

---

**Desenvolvido por VieraMotoDelivery**
**Email:** vieiramdelivery@gmail.com
**GitHub:** [@VieraMotoDelivery](https://github.com/VieraMotoDelivery)
