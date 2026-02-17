# Proxy mTLS para SEFAZ-GO (Local + ngrok)

Microserviço Node.js que faz a ponte mTLS entre as edge functions e a SEFAZ.

## Instalação Rápida (Local)

### 1. Instale as dependências

```bash
cd proxy-sefaz
npm install
```

### 2. Inicie o proxy

```bash
node server.js
```

Você verá:
```
🔒 Proxy SEFAZ mTLS rodando na porta 3001
   Health check: http://localhost:3001/health
   Endpoint:     http://localhost:3001/proxy
```

### 3. Exponha com ngrok (grátis)

Em outro terminal:

```bash
# Instale ngrok (se não tiver): https://ngrok.com/download
# Ou: npm install -g ngrok

ngrok http 3001
```

O ngrok vai mostrar algo como:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:3001
```

### 4. Configure o secret no projeto

Copie a URL do ngrok e adicione `/proxy` no final.  
Exemplo: `https://abc123.ngrok-free.app/proxy`

Atualize o secret `SEFAZ_PROXY_URL` no projeto com essa URL.

> ⚠️ A URL do ngrok muda toda vez que você reinicia (na versão grátis).  
> Você precisará atualizar o secret quando reiniciar.

## Teste

```bash
# Verificar se está rodando:
curl http://localhost:3001/health

# Via ngrok:
curl https://abc123.ngrok-free.app/health
```

## Como funciona

```
Edge Function → ngrok → localhost:3001 → SEFAZ (mTLS) → resposta
```

1. A edge function prepara e assina o XML da NF-e
2. Envia o XML + certificado PEM para o proxy via ngrok
3. O proxy faz a requisição HTTPS com mTLS à SEFAZ-GO
4. Retorna a resposta da SEFAZ para a edge function

## Segurança

- O certificado PFX é parseado na edge function, apenas o PEM temporário é enviado
- Use `PROXY_SECRET` + `SEFAZ_PROXY_SECRET` para autenticar:

```bash
PROXY_SECRET=meu_token_secreto node server.js
```

- O proxy não armazena nenhum dado
