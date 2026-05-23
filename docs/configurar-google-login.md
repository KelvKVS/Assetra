# Configurar login com Google (Assetra)

O login **Entrar com Google** usa redirect no browser (só precisa do **Client ID** no `.env`).  
`GOOGLE_CLIENT_SECRET` é opcional (só se quiser o fluxo antigo pelo servidor).

## O que fazer no Google Cloud Console

1. Abra [Credenciais](https://console.cloud.google.com/apis/credentials).
2. Cliente OAuth **Aplicação da Web** (mesmo `GOOGLE_CLIENT_ID` do `.env`).
3. Copie o **Segredo do cliente** → `GOOGLE_CLIENT_SECRET` em `backend/.env`.

### URIs de redirecionamento autorizados (obrigatório)

Adicione **exatamente** (sem barra no fim):

| Ambiente | URI |
|----------|-----|
| Dev (login) | `http://localhost:5173/login` |
| Dev (ADM importar utilizador) | `http://localhost:5173/usuarios` |
| Produção (login) | `https://assetra-seven.vercel.app/login` |
| Produção (ADM) | `https://assetra-seven.vercel.app/usuarios` |
| Dev (servidor, opcional) | `http://localhost:5173/api/auth/google/callback` |
| Produção (servidor, opcional) | `https://assetra-44la.onrender.com/api/auth/google/callback` |

> **Não** basta `http://localhost:3000` ou `http://localhost:5173` sozinhos — tem de ser o caminho completo com `/api/auth/google/callback`.

### Origens JavaScript (opcional para login; útil para ADM)

| Ambiente | Origem |
|----------|--------|
| Dev | `http://localhost:5173` |
| Vercel | `https://assetra-seven.vercel.app` |

## Variáveis no `backend/.env`

```env
GOOGLE_CLIENT_ID=203849704070-....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=cole-o-segredo-aqui
FRONTEND_URL=http://localhost:5173
GOOGLE_REDIRECT_URI=http://localhost:5173/api/auth/google/callback
API_PUBLIC_URL=http://localhost:3000
```

Produção:

```env
FRONTEND_URL=https://assetra-seven.vercel.app
GOOGLE_REDIRECT_URI=https://assetra-44la.onrender.com/api/auth/google/callback
API_PUBLIC_URL=https://assetra-44la.onrender.com
```

## Variáveis na raiz (`.env`) — só para ADM importar Google

```env
VITE_GOOGLE_CLIENT_ID=mesmo-id-do-backend
VITE_API_BASE_URL=/api
```

## Depois de alterar

1. Guardar no Google Cloud e esperar 2–5 minutos.
2. Reiniciar `npm run dev`.
3. Testar com e-mail **já cadastrado** pelo ADM (Gmail real). Contas `@assetra.local` do seed **não** funcionam com Google.
