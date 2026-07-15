# PlantApp — Contexto Completo del Proyecto

> Aplicación web full-stack para el registro y seguimiento comunitario de reforestación.
> **En vivo:** frontend `https://plantapp-black.vercel.app` · API `https://plantapp-upfy.onrender.com`
> **Repositorio:** `https://github.com/MikeSs26/plantapp`

---

## 1. Objetivo del proyecto

PlantApp busca **incentivar y visibilizar la reforestación** convirtiendo el acto de plantar un árbol en una experiencia social, verificable y medible. El problema que resuelve es doble:

1. **Falta de registro y evidencia:** normalmente, cuando una persona planta un árbol, no queda constancia de dónde, cuándo ni quién lo hizo. PlantApp permite registrar cada árbol con su **ubicación geográfica, foto y especie**, creando un mapa colectivo del impacto ambiental.
2. **Falta de motivación sostenida:** al añadir una capa social (perfiles, "me gusta", comentarios, ranking), la app fomenta la participación continua y el sentido de comunidad entre reforestadores.

En resumen, el objetivo es **transformar la reforestación individual en un esfuerzo comunitario, transparente y motivador**, con mecanismos que garanticen la autenticidad de los registros.

---

## 2. Descripción general

PlantApp es una aplicación web responsive (pensada primero para móvil) donde los usuarios:

- Crean una cuenta y un perfil público con nombre de usuario propio.
- Registran los árboles que plantan, indicando especie, foto y ubicación en un mapa interactivo.
- Exploran un **feed comunitario** con todos los árboles registrados, pudiendo dar "me gusta" y comentar.
- Visualizan un **mapa global** con la ubicación de cada árbol.
- Consultan un **ranking** de los usuarios que más han plantado.
- Ven el **clima actual** en la ubicación de sus árboles.

Además, los usuarios con rol de **administrador** cuentan con un panel de gestión de la comunidad y un panel de pruebas de calidad (QA).

---

## 3. Tecnologías utilizadas

### Backend
| Tecnología | Uso |
|---|---|
| **Python 3.13** | Lenguaje del servidor |
| **Django 6.0** | Framework web principal |
| **Django REST Framework 3.17** | Construcción de la API REST |
| **PostgreSQL** (Neon) | Base de datos relacional |
| **djangorestframework-simplejwt** | Autenticación por tokens JWT |
| **httpx** | Cliente HTTP **asíncrono** (peticiones concurrentes) |
| **Cloudinary** | Almacenamiento de imágenes en la nube |
| **Gunicorn** | Servidor de aplicaciones en producción |
| **WhiteNoise** | Servido de archivos estáticos |
| **dj-database-url** | Configuración de BD por variable de entorno |

### Frontend
| Tecnología | Uso |
|---|---|
| **React 19 + TypeScript** | Interfaz de usuario |
| **Vite** | Empaquetado y servidor de desarrollo |
| **Tailwind CSS v4** | Estilos y modo oscuro |
| **React Router v7** | Navegación entre páginas (SPA) |
| **Axios** | Cliente HTTP hacia la API |
| **Leaflet + react-leaflet** | Mapas interactivos |
| **lucide-react** | Iconografía |

### Servicios externos (gratuitos, sin costo)
| Servicio | Uso |
|---|---|
| **OpenStreetMap** | Cartografía de los mapas (sin API key) |
| **Open-Meteo** | Clima en tiempo real (sin API key ni registro) |
| **Cloudinary** | CDN y transformación de imágenes |

### Infraestructura y despliegue
| Plataforma | Rol |
|---|---|
| **Vercel** | Hospeda el frontend (CDN global) |
| **Render** | Hospeda el backend Django |
| **Neon** | Base de datos PostgreSQL en la nube |
| **GitHub** | Control de versiones y disparador de despliegues |

---

## 4. Arquitectura

```
┌──────────────────────────────────────────────────────────┐
│  NAVEGADOR DEL USUARIO                                    │
└───────────────────────────┬──────────────────────────────┘
                            │ HTTPS
                            ▼
┌──────────────────────────────────────────────────────────┐
│  FRONTEND (Vercel) — React + TypeScript + Tailwind        │
│  Páginas: Landing, Login, Registro, Feed, Perfil,         │
│  Perfil público, Panel Admin, Panel de Pruebas QA         │
└───────────────────────────┬──────────────────────────────┘
                            │ API REST (JSON + token JWT)
                            ▼
┌──────────────────────────────────────────────────────────┐
│  BACKEND (Render) — Django REST Framework                 │
│  Autenticación, árboles, likes, comentarios, ranking,     │
│  perfiles, administración, anti-fraude, clima asíncrono   │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│  BASE DE DATOS (Neon) — PostgreSQL                        │
│  Tablas: User, Tree, Like, Comment                        │
└──────────────────────────────────────────────────────────┘
```

La aplicación sigue una arquitectura **cliente-servidor desacoplada**: el frontend y el backend son proyectos independientes que se comunican exclusivamente por una API REST, lo que permite desplegarlos y escalarlos por separado.

---

## 5. Modelo de datos

| Entidad | Campos principales | Relaciones |
|---|---|---|
| **User** (personalizado) | email (login), username (identificador público único), display_name, bio, avatar_url, location, role (user/admin), email_verified, created_at | — |
| **Tree** | species, photo_url, latitude, longitude, planted_at | pertenece a un User |
| **Like** | created_at | User + Tree (único por par) |
| **Comment** | text (máx. 500), created_at | User + Tree |

El inicio de sesión es **por correo electrónico** (no por usuario), pero cada persona tiene además un `username` único que se usa en la URL de su perfil público.

---

## 6. Contenido y funcionalidades

### 6.1 Autenticación y perfiles
- Registro e inicio de sesión con **JWT** (tokens de acceso de 30 min + refresco de 7 días con rotación).
- Perfil editable: nombre público, **nombre de usuario**, biografía, ubicación y **foto de avatar** (subida a Cloudinary).
- **Perfiles públicos** (`/app/users/<usuario>`): cualquier usuario puede ver el perfil de otro y todos sus árboles.

### 6.2 Registro de árboles
- Formulario con especie, **foto obligatoria** y ubicación seleccionada en un **mapa interactivo** (Leaflet) o mediante el botón "Mi ubicación" (geolocalización del dispositivo).
- Las fotos se **normalizan automáticamente a JPG** y se redimensionan (soluciona el formato HEIC de los iPhone/Android).

### 6.3 Red social
- **Feed** paginado (12 por página) con búsqueda, filtros (todos / míos) y orden (recientes / más queridos), todo procesado en el servidor.
- **Mapa comunitario** con todos los árboles marcados.
- Sistema de **"me gusta"** (único por usuario y árbol) y **comentarios**.
- **Ranking** (leaderboard) con los 10 usuarios que más árboles han plantado.

### 6.4 Panel de administración (rol admin)
- **Métricas** de la plataforma (usuarios, árboles, comentarios, likes, nuevos de la semana).
- **Gestión de usuarios**: promover/quitar admin, activar/desactivar y eliminar cuentas.
- **Moderación**: un administrador puede borrar cualquier árbol o comentario.
- **Candados de seguridad**: un admin no puede quitarse su propio rol ni eliminarse a sí mismo.

### 6.5 Medidas anti-fraude ("Fraude Verde")
Para garantizar que los registros sean reales y no inventados, el backend aplica cuatro reglas al crear un árbol:
1. **Foto obligatoria** — evidencia visual del árbol.
2. **Validación por radio (50 km)** — el árbol debe estar a menos de 50 km de la **ubicación real** del usuario, capturada en vivo en cada registro (nunca almacenada).
3. **Validación geo-temporal** — rechaza registrar un árbol a menos de 5 metros de otro del mismo usuario en las últimas 24 horas (evita duplicados).
4. **Límite diario** — máximo 5 árboles por día por usuario estándar (los admins están exentos).

### 6.6 Función asíncrona — clima en vivo
Tarjeta **"Clima de tus árboles"** que muestra la temperatura, humedad y condición actual en la ubicación de cada árbol del usuario. El backend consulta el clima de **todos los árboles de forma concurrente** (`asyncio.gather` + `httpx.AsyncClient`) contra la API de Open-Meteo: consultar 15 ubicaciones tarda casi lo mismo que consultar una sola.

### 6.7 Experiencia de usuario
- **Modo oscuro** conmutable y persistente.
- **Notificaciones tipo toast** (en lugar de alertas del navegador).
- **Cargadores esqueleto** (skeleton loaders) mientras cargan los datos.
- Diseño **responsive**, pensado primero para móvil.

### 6.8 Verificación de correo (implementada, desactivada)
Se implementó un flujo completo de verificación de correo al registrarse (con envío de enlace y bloqueo hasta confirmar). Actualmente está **desactivado mediante una variable de configuración** (`REQUIRE_EMAIL_VERIFICATION`) debido a que el proveedor de hosting bloquea el envío de correos por SMTP; el código permanece en el proyecto y puede reactivarse.

---

## 7. Despliegue y flujo de trabajo

- **Rama `develop`**: desarrollo diario.
- **Rama `main`**: producción. Cada `git push` a `main` **redespliega automáticamente** el backend (Render) y el frontend (Vercel).
- Toda la configuración sensible (claves, base de datos, credenciales) se gestiona con **variables de entorno**, nunca en el código.

---

## 8. Pruebas realizadas (Aseguramiento de Calidad)

El proyecto incorpora un enfoque de **verificación en dos niveles**: pruebas automatizadas (unitarias y de integración) y un panel de pruebas ejecutables en vivo, más un experimento de inyección de fallos que demuestra que las pruebas son reales.

### 8.1 Pruebas funcionales
Verifican que una funcionalidad **cumple su requisito** (enfoque de caja negra: entrada → salida esperada).

| # | Caso de prueba | Entrada | Resultado esperado |
|---|---|---|---|
| F1 | Rechazo de árbol fuera del radio | Árbol en Tokio, usuario en Bogotá | La API responde **400** (rechazado) |
| F2 | Registro rechaza correo duplicado | Correo ya registrado | La API responde **400** (rechazado) |
| F3 | Foto obligatoria al registrar árbol | Árbol sin foto | La API responde **400** (rechazado) |

### 8.2 Pruebas no funcionales
Verifican **atributos de calidad** del sistema (no una funcionalidad concreta).

| # | Caso de prueba | Categoría | Resultado esperado |
|---|---|---|---|
| NF1 | Tiempo de respuesta de la API | **Rendimiento** | Respuesta en menos de 2000 ms |
| NF2 | Endpoints protegidos exigen autenticación | **Seguridad** | Petición sin token responde **401** |
| NF3 | El feed pagina los resultados | **Escalabilidad** | Respuesta paginada (`count` + `results`) |

> Nota: en el backend existen además comprobaciones de seguridad complementarias, como la verificación de que las contraseñas se almacenan con **hash fuerte** (`pbkdf2_sha256`), nunca en texto plano.

### 8.3 Panel de pruebas de QA (pruebas de integración visibles)
Se construyó un **panel exclusivo para administradores** (`/app/admin/tests`) que ejecuta las 6 pruebas anteriores. La característica clave es que **cada prueba realiza una petición HTTP real** al servidor, verificable en la pestaña **Red / Network** de las herramientas del navegador:

- F1, F2, F3 → `POST` que el servidor **rechaza con 400** (sin crear datos, porque la validación ocurre antes de guardar).
- NF2 → `GET /api/auth/me/` sin token → **401**.
- NF3 → `GET /api/trees/?page=1` → **200** con estructura paginada.
- NF1 → `GET /api/stats/` → **200** con el tiempo real medido.

Esto permite que un evaluador **corrobore en vivo** que las pruebas se ejecutan realmente contra el sistema, viendo cada petición, su cuerpo y su respuesta.

### 8.4 Pruebas automatizadas
El backend cuenta con **38 pruebas automatizadas**, ejecutables tanto con `python manage.py test` (25 de ellas, estilo `unittest`) como con `pytest` (las 38, incluyendo las nuevas en estilo idiomático de Pytest). Configuración en `backend/pytest.ini`.

- **Anti-fraude (9 pruebas):** radio, proximidad geo-temporal, límite diario, exención de admin, foto obligatoria y ubicación del reportero.
- **Verificación de correo (10 pruebas):** registro, bloqueo de login sin verificar, verificación válida/inválida, no reutilización del enlace, reenvío sin filtrar información, y el comportamiento con la verificación desactivada.
- **Panel de diagnóstico (3 pruebas):** composición del conjunto, acceso solo para admins y forma de la respuesta.
- **Función asíncrona / clima (3 pruebas):** obtención concurrente por árbol (con `httpx` simulado), atajo cuando no hay árboles, y respuesta para usuarios sin árboles.
- **Funcionales en Pytest puro (4 pruebas):** `test_pytest_functional.py` — like toggle, control de propiedad de comentarios, perfil público sin exponer email, orden del ranking.
- **No funcionales de seguridad — OWASP Top 10 (9 pruebas):** `test_owasp.py` — control de acceso, exposición de credenciales, inyección SQL, contraseñas débiles, configuración segura por defecto, autenticación y límite de tasa. Ver detalle punto a punto en [PROYECTO.md §6.3](PROYECTO.md#63-pruebas-no-funcionales--owasp-top-10-pytest).

Todas las pruebas pasan correctamente (38/38):
```
============================= 38 passed in ~20s =============================
```

### 8.5 Experimento de inyección de fallos
Para demostrar que las pruebas **detectan errores reales** (y no siempre pasan), se realizó un experimento controlado:

| Estado del código | Prueba de radio | Prueba de paginación | Resto |
|---|---|---|---|
| Intacto | 🟢 PASÓ | 🟢 PASÓ | 🟢 |
| **Con bug inyectado** | 🔴 **FALLÓ** | 🔴 **FALLÓ** | 🟢 (sin cambios) |
| Restaurado | 🟢 PASÓ | 🟢 PASÓ | 🟢 |

Al introducir deliberadamente un error en dos funciones, **únicamente las pruebas correspondientes se pusieron en rojo**, mientras las demás siguieron en verde. Esto confirma que cada prueba evalúa el comportamiento real del sistema y que su resultado no está predeterminado.

### 8.6 Análisis estático de seguridad (Bandit)
Se ejecutó **Bandit** (herramienta oficial de PyCQA/OWASP para análisis estático en Python) sobre todo el código de la aplicación. Resultado: **0 hallazgos de severidad media/alta** en el código de producción (`core/`, `plantapp/`, `users/`, excluyendo archivos de prueba).

Durante el escaneo se identificaron y resolvieron 3 hallazgos reales — incluyendo un valor por defecto **inseguro** de `DEBUG` (quedaba en `True` si la variable de entorno faltaba) que se corrigió a seguro-por-defecto (`False`). Detalle completo, con justificación de cada hallazgo, en [PROYECTO.md §6.4](PROYECTO.md#64-análisis-estático-de-seguridad-bandit). Reporte crudo en `backend/bandit_report.txt`.

### 8.7 Documento académico complementario
Para la formulación completa del proyecto, requerimientos funcionales/no funcionales, justificación de tecnologías, alcance, trazabilidad requerimiento→prueba y el plan de gestión de cambios y mantenimiento, ver **[PROYECTO.md](PROYECTO.md)**.

---

## 9. Conclusión

PlantApp es una aplicación full-stack **funcional y desplegada en producción** que cumple su objetivo de fomentar y registrar la reforestación de forma comunitaria y verificable. Integra autenticación segura, funciones sociales, un panel administrativo, mecanismos anti-fraude, una función asíncrona de consulta concurrente de clima y un sistema de aseguramiento de calidad con pruebas funcionales, no funcionales, automatizadas y verificables en vivo. Su arquitectura desacoplada y su configuración basada en variables de entorno la hacen mantenible y escalable.
