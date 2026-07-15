# 🚀 Desplegar PlantApp — Vercel + Render + Neon

Arquitectura: **frontend en Vercel** (CDN global) · **backend Django en Render** (plan gratuito) · **PostgreSQL en Neon** (gratuito, no expira).

> El código ya está preparado: todo se configura con variables de entorno.
> Orden recomendado: Neon → Render → Vercel → ajuste final de CORS.

---

## 1. Base de datos — Neon (5 min)

1. Crea una cuenta en <https://neon.tech> (puedes entrar con GitHub).
2. Crea un proyecto (ej. `plantapp`), región `US East` o la más cercana.
3. Copia la **connection string** que te muestra (empieza con `postgresql://...` y termina con `?sslmode=require`). Esa es tu `DATABASE_URL`.

## 2. Sube el código a GitHub

El repo ya existe (`MikeSs26/plantapp`). Solo confirma que lo último esté subido:

```powershell
cd C:\dev\plantapp
git add -A
git commit -m "Preparar despliegue"
git push
```

## 3. Backend — Render (10 min)

1. Crea una cuenta en <https://render.com> (entra con GitHub).
2. **New → Web Service** → conecta el repo `plantapp`.
3. Configuración:
   - **Root Directory:** `backend`
   - **Build Command:**
     ```
     pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
     ```
   - **Start Command:**
     ```
     gunicorn core.wsgi:application
     ```
   - **Instance Type:** Free
4. **Environment Variables** (sección Environment):

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | la connection string de Neon |
   | `SECRET_KEY` | genera una nueva (comando abajo) — **no uses la del .env local** |
   | `DEBUG` | `False` |
   | `ALLOWED_HOSTS` | `plantapp-XXXX.onrender.com` (el dominio que Render te asigne) |
   | `CORS_ALLOWED_ORIGINS` | `https://tu-app.vercel.app` (lo sabrás en el paso 4; puedes volver a editarlo) |
   | `CSRF_TRUSTED_ORIGINS` | `https://plantapp-XXXX.onrender.com` |
   | `CLOUDINARY_CLOUD_NAME` | el de tu `.env` local |
   | `CLOUDINARY_API_KEY` | el de tu `.env` local |
   | `CLOUDINARY_API_SECRET` | el de tu `.env` local (idealmente el rotado) |
   | `BREVO_API_KEY` | tu API key de Brevo (envío de correos por HTTPS) |
   | `DEFAULT_FROM_EMAIL` | `PlantApp <tucorreo@gmail.com>` (remitente verificado en Brevo) |
   | `FRONTEND_URL` | `https://tu-app.vercel.app` (para armar el enlace de verificación) |
   | `PYTHON_VERSION` | `3.13.4` |

   Generar SECRET_KEY nueva:
   ```powershell
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```

   **Correo con Brevo** (recomendado — Render bloquea SMTP saliente):
   1. Crea una cuenta gratis en <https://www.brevo.com> (300 correos/día).
   2. Verifica tu correo remitente: **Senders, Domains & Dedicated IPs → Senders**
      → agrega el correo que usarás en `DEFAULT_FROM_EMAIL` y confirma el enlace
      que te llega.
   3. Crea una API key: **SMTP & API → API Keys → Generate a new API key** →
      úsala como `BREVO_API_KEY` en Render.

   Si `BREVO_API_KEY` está vacío, el backend intenta SMTP (`EMAIL_HOST_USER` /
   `EMAIL_HOST_PASSWORD`), que suele estar bloqueado en Render. Sin ninguno de
   los dos, los correos se imprimen en los logs (útil solo en desarrollo local).

5. Deploy. Cuando termine, prueba: `https://plantapp-XXXX.onrender.com/api/stats/` → debe responder JSON.

6. **Crear tu superusuario en producción**: en Render → tu servicio → pestaña *Shell* no está en el plan free, así que agrega TEMPORALMENTE estas variables y haz un deploy manual con el Build Command extendido:
   ```
   pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate && (python manage.py createsuperuser --noinput || true)
   ```
   con `DJANGO_SUPERUSER_EMAIL` y `DJANGO_SUPERUSER_PASSWORD` como env vars. Después puedes quitar esas dos variables y volver al Build Command normal.

## 4. Frontend — Vercel (5 min)

1. Crea una cuenta en <https://vercel.com> (entra con GitHub).
2. **Add New → Project** → importa el repo `plantapp`.
3. Configuración:
   - **Root Directory:** `frontend`
   - Framework: Vite (lo detecta solo)
4. **Environment Variables:**

   | Variable | Valor |
   |---|---|
   | `VITE_API_URL` | `https://plantapp-XXXX.onrender.com/api/` (¡con la barra final!) |

5. Deploy. Te dará un dominio tipo `https://plantapp-xyz.vercel.app`.

## 5. Cierre del círculo

1. Vuelve a Render → Environment → actualiza `CORS_ALLOWED_ORIGINS` con tu dominio real de Vercel (ej. `https://plantapp-xyz.vercel.app`, sin barra final). Render redespliega solo.
2. Abre tu dominio de Vercel, crea una cuenta, registra un árbol con foto y dale like. 🌳

## Notas

- **Primer request lento:** el plan free de Render duerme el backend tras 15 min sin tráfico; despertar tarda ~1 min. Es normal.
- **La base local no se toca:** tu desarrollo sigue igual (`.env` local usa las variables `DB_*`).
- Cada `git push` a `main` redespliega automáticamente backend y frontend.
