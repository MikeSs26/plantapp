# PlantApp — Documento de Proyecto

**Repositorio:** github.com/MikeSs26/plantapp
**Producción:** [plantapp-black.vercel.app](https://plantapp-black.vercel.app) (frontend) · [plantapp-upfy.onrender.com](https://plantapp-upfy.onrender.com) (backend)
**Documentación técnica complementaria:** [TECHNICAL_OVERVIEW.md](TECHNICAL_OVERVIEW.md)

---

## 1. Formulación del proyecto

### 1.1 Problema

La reforestación comunitaria carece de herramientas simples para que las personas comunes —no solo organizaciones grandes— registren, compartan y hagan seguimiento a los árboles que plantan. No existe un incentivo social visible (reconocimiento, comunidad, prueba pública) que motive a un individuo a plantar más de una vez, ni un mecanismo accesible para verificar que un árbol registrado realmente fue plantado donde se dice.

### 1.2 Objetivo general

Desarrollar una aplicación web full-stack que permita a cualquier persona registrar árboles plantados con evidencia geográfica y fotográfica, e interactuar con una comunidad de reforestadores mediante likes, comentarios y un ranking público.

### 1.3 Objetivos específicos

1. Implementar autenticación segura de usuarios (JWT) con perfiles públicos y privados.
2. Permitir el registro de árboles con ubicación geográfica (mapa interactivo) y fotografía.
3. Construir mecanismos anti-fraude que verifiquen que el registro corresponde a un evento real (proximidad geográfica, límites de frecuencia, evidencia fotográfica).
4. Habilitar interacción social: likes, comentarios, ranking de reforestadores.
5. Proveer un panel de administración con moderación de contenido y gestión de roles.
6. Desplegar la aplicación en infraestructura en la nube accesible públicamente.
7. Garantizar la calidad del software mediante pruebas funcionales y no funcionales verificables.

---

## 2. Descripción general

**PlantApp** es una aplicación web mobile-first donde los usuarios:

- Se registran y crean un perfil público (`@username`) con biografía, ubicación y foto.
- Registran árboles plantados marcando su ubicación en un mapa interactivo (Leaflet + OpenStreetMap), adjuntando una foto obligatoria como evidencia.
- Ven el clima en tiempo real de cada árbol que plantaron (consulta concurrente a un servicio meteorológico externo).
- Dan like y comentan los árboles de otros usuarios.
- Consultan un ranking público de los reforestadores con más árboles plantados.
- Los administradores gestionan usuarios (roles, activación/desactivación), moderan contenido (borrar árboles/comentarios ajenos), y ejecutan un panel de pruebas de calidad en vivo.

---

## 3. Alcance del proyecto

### 3.1 Incluido en el alcance

- Registro/login de usuarios con contraseña (JWT).
- CRUD de árboles con geolocalización, foto, especie.
- Sistema social: likes, comentarios, ranking.
- Perfiles públicos navegables por nombre de usuario.
- Panel de administración con control de roles y moderación.
- Reglas anti-fraude automatizadas (ver sección 4.2).
- Función meteorológica asíncrona por árbol.
- Suite de pruebas funcionales y no funcionales (panel en vivo + automatizadas).
- Despliegue en producción (Vercel + Render + Neon).

### 3.2 Fuera del alcance (decisiones explícitas)

- **Verificación de correo electrónico real**: se implementó completa (tokens firmados, endpoints, UI) pero quedó **desactivada** detrás de un *feature flag* (`REQUIRE_EMAIL_VERIFICATION=False`) tras comprobar que Render bloquea conexiones SMTP salientes y que los proveedores de correo por API (Brevo) presentaron fallas durante la configuración. El código permanece en el repositorio, listo para reactivarse cuando se resuelva el transporte de correo — es una decisión de alcance documentada, no una omisión.
- Pagos o monetización.
- Notificaciones push o en tiempo real (WebSockets).
- Aplicación móvil nativa (la web es responsive y funciona en móvil vía navegador).

### 3.3 Consistencia con los requerimientos

Cada requerimiento funcional (sección 4.1) tiene un endpoint de API, una vista de frontend, y al menos una prueba automatizada que lo verifica (ver sección 6, tabla de trazabilidad). Cada requerimiento no funcional (sección 4.2) tiene un mecanismo técnico concreto implementado y una prueba que lo comprueba en vivo.

---

## 4. Requerimientos

### 4.1 Requerimientos funcionales

| ID | Requerimiento | Implementación |
|----|---------------|-----------------|
| RF-01 | El sistema debe permitir el registro de un usuario con email, contraseña y nombre de usuario único | `POST /api/auth/register/` |
| RF-02 | El sistema debe autenticar usuarios mediante credenciales y emitir tokens de sesión | `POST /api/auth/login/` (JWT) |
| RF-03 | El usuario debe poder registrar un árbol con especie, foto obligatoria y ubicación geográfica | `POST /api/trees/` |
| RF-04 | El usuario debe poder editar su perfil público (nombre, bio, ubicación, avatar, username) | `PATCH /api/auth/me/` |
| RF-05 | Cualquier usuario autenticado debe poder consultar el perfil público de otro por su username | `GET /api/users/<username>/` |
| RF-06 | El usuario debe poder dar/quitar like a un árbol | `POST /api/trees/<id>/like/` |
| RF-07 | El usuario debe poder comentar y borrar sus propios comentarios | `POST/DELETE /api/comments/` |
| RF-08 | El sistema debe mostrar un ranking de los 10 usuarios con más árboles plantados | `GET /api/leaderboard/` |
| RF-09 | El sistema debe mostrar el clima actual de cada árbol del usuario | `GET /api/trees/weather/` |
| RF-10 | Un administrador debe poder cambiar el rol o desactivar cualquier usuario, con salvaguardas contra auto-bloqueo | `PATCH/DELETE /api/admin/users/<id>/` |
| RF-11 | Un administrador debe poder eliminar cualquier árbol o comentario (moderación) | Permiso `IsOwnerOrReadOnly` extendido a rol admin |
| RF-12 | Un administrador debe poder ejecutar una batería de pruebas de calidad desde la interfaz | Panel `/app/admin/tests` |

### 4.2 Requerimientos no funcionales

| ID | Requerimiento | Mecanismo implementado |
|----|---------------|--------------------------|
| RNF-01 (Seguridad) | Las contraseñas nunca se almacenan ni se exponen en texto plano | Hash `pbkdf2_sha256` (Django); excluidas de todos los serializers |
| RNF-02 (Seguridad) | El sistema debe resistir ataques de inyección SQL | ORM de Django (queries parametrizadas), sin SQL crudo |
| RNF-03 (Seguridad) | Los endpoints administrativos deben rechazar usuarios sin el rol adecuado | Permiso `IsAdminRole`, verificado en cada request |
| RNF-04 (Seguridad) | El sistema debe limitar la tasa de registro para prevenir abuso/spam | `ScopedRateThrottle` (30 registros/hora por IP) |
| RNF-05 (Anti-fraude) | Un árbol no puede registrarse a más de 50 km de la ubicación real reportada por el navegador | `validate_within_user_radius` (haversine) |
| RNF-06 (Anti-fraude) | Un usuario no puede registrar más de 5 árboles por día | `validate_daily_limit` |
| RNF-07 (Anti-fraude) | Un usuario no puede duplicar un árbol a menos de 5 m de otro propio en 24 h | `validate_proximity` |
| RNF-08 (Rendimiento) | Las consultas al feed deben responder en menos de 1.5 s | Verificado en panel de QA (tiempo real medido) |
| RNF-09 (Rendimiento) | Las consultas de clima a múltiples árboles deben ejecutarse en paralelo, no en serie | `asyncio.gather` + `httpx.AsyncClient` |
| RNF-10 (Escalabilidad) | El feed de árboles debe paginarse, nunca devolver todos los registros de golpe | `PageNumberPagination` (12/página) |
| RNF-11 (Disponibilidad) | La aplicación debe estar desplegada y accesible públicamente 24/7 | Vercel + Render + Neon |
| RNF-12 (Mantenibilidad) | El código debe tener cobertura de pruebas automatizadas verificable | 38 pruebas Pytest + panel de QA en navegador |

---

## 5. Justificación de la selección de tecnologías

| Tecnología | Rol | Justificación |
|------------|-----|----------------|
| **Django + Django REST Framework** | Backend / API | Framework maduro con ORM seguro por defecto (previene inyección SQL), sistema de autenticación y permisos robusto, y un ecosistema de testing de primer nivel (`APITestCase`, `pytest-django`). Reduce tiempo de desarrollo frente a construir estas piezas manualmente. |
| **PostgreSQL (Neon)** | Base de datos | Motor relacional maduro con soporte nativo de tipos geográficos (decimales de alta precisión para lat/long) y transacciones ACID, necesarias para garantizar consistencia en likes/comentarios. Neon ofrece un plan gratuito administrado, sin necesidad de gestionar un servidor de base de datos. |
| **React + TypeScript + Vite** | Frontend | TypeScript reduce errores en tiempo de compilación (tipado de las respuestas de la API). Vite ofrece recarga instantánea en desarrollo y builds de producción optimizados. React tiene el ecosistema más amplio de componentes (mapas, iconos) necesarios para este proyecto. |
| **JWT (djangorestframework-simplejwt)** | Autenticación | Autenticación *stateless*: el servidor no necesita mantener sesiones en memoria, lo que permite escalar horizontalmente. La rotación de refresh tokens mitiga el riesgo de robo de tokens de larga duración. |
| **Leaflet + OpenStreetMap** | Mapas | Alternativa gratuita y de código abierto a Google Maps; no requiere clave de API ni facturación, crítico para un proyecto sin presupuesto. |
| **Cloudinary** | Almacenamiento de imágenes | Conversión automática de formatos (HEIC de iPhone → JPG universal) y redimensionado en el borde, evitando implementar procesamiento de imágenes propio. Plan gratuito suficiente para el alcance del proyecto. |
| **httpx (async) + Open-Meteo** | Función asíncrona (clima) | `httpx.AsyncClient` es el cliente HTTP asíncrono estándar de Python, compatible con `asyncio.gather` para paralelizar múltiples peticiones I/O-bound. Open-Meteo no requiere clave de API, ideal para una función educativa sin fricción de registro. |
| **Tailwind CSS v4** | Estilos | Utilidades atómicas que evitan hojas de estilo separadas y garantizan consistencia visual (modo oscuro incluido) sin overhead de mantenimiento de CSS propio. |
| **Vercel / Render / Neon** | Despliegue | Combinación de planes gratuitos suficientes para un proyecto académico: Vercel para el frontend estático con CDN global, Render para el backend con despliegue automático desde Git, Neon para PostgreSQL gestionado sin necesidad de administrar infraestructura. |
| **Pytest + pytest-django** | Pruebas funcionales | Estándar de la industria para testing en Python; sintaxis más concisa que `unittest`, soporte de *fixtures* reutilizables, y compatible con las pruebas basadas en `TestCase` ya existentes (no requiere reescribir nada). |
| **Bandit** | Pruebas no funcionales (seguridad) | Herramienta oficial de OWASP/PyCQA para análisis estático de seguridad en Python; detecta patrones de riesgo reales (contraseñas hardcodeadas, uso inseguro de `eval`, `urlopen`, etc.) directamente sobre el código fuente. |

---

## 6. Pruebas realizadas

Se aplicaron **dos capas independientes** de pruebas: (a) un panel visual ejecutado desde el navegador, con peticiones HTTP reales verificables en las herramientas de desarrollador, y (b) una suite automatizada con Pytest que corre en terminal/CI. Ambas capas prueban el sistema real desplegado, sin mocks que oculten el comportamiento verdadero.

### 6.1 Panel de QA en vivo (navegador)

Ubicado en `/app/admin/tests` (solo administradores). Cada prueba dispara una **petición HTTP real** contra la API, visible en la pestaña *Network* del navegador y registrada en la *Consola*. Esto permite a un tercero corroborar, en tiempo real, que las pruebas no son simuladas.

| # | Prueba | Tipo | Petición real | Resultado esperado |
|---|--------|------|----------------|----------------------|
| 1 | Foto obligatoria al plantar | Funcional | `POST /api/trees/` (sin foto) | HTTP 400 |
| 2 | Rechazo de correo duplicado | Funcional | `POST /api/auth/register/` (correo existente) | HTTP 400 |
| 3 | Árbol fuera del radio de 50 km | Funcional | `POST /api/trees/` (árbol en Tokio, usuario en Bogotá) | HTTP 400 |
| 4 | Endpoints protegidos exigen token | No funcional (seguridad) | `GET /api/auth/me/` (sin token) | HTTP 401 |
| 5 | Paginación activa en el feed | No funcional (escalabilidad) | `GET /api/trees/?page=1` | HTTP 200, `{count, results[]}` |
| 6 | Tiempo de respuesta de la API | No funcional (rendimiento) | `GET /api/stats/` | < 2000 ms, medido en tiempo real |

**Evidencia de que las pruebas son reales (experimento de inyección de fallos):** durante el desarrollo se modificó deliberadamente el código de dos reglas (el radio de 50 km y el tamaño de página) para desactivarlas, se ejecutó el panel, y **las pruebas correspondientes se pusieron en rojo** mientras las demás permanecieron en verde. Al restaurar el código, volvieron a verde. Esto demuestra que las pruebas detectan fallos reales del sistema, no resultados fijos.

### 6.2 Pruebas automatizadas con Pytest (38 en total)

Ejecutables con: `pytest -v` desde `backend/`. Configuración en `backend/pytest.ini`.

**Distribución:**
- 25 pruebas de integración (estilo `APITestCase`, en `tests.py` de cada app) — cubren autenticación, verificación de correo (código conservado aunque desactivado), reglas anti-fraude, panel de diagnóstico del servidor, y la función asíncrona de clima.
- 4 pruebas funcionales nuevas en estilo Pytest idiomático (`plantapp/test_pytest_functional.py`) — like toggle, control de propiedad en comentarios, perfil público case-insensitive sin exponer email, orden del ranking.
- 9 pruebas no funcionales de seguridad mapeadas a OWASP Top 10 (`plantapp/test_owasp.py`) — ver sección 6.3.

```
============================= 38 passed in ~20s =============================
```

### 6.3 Pruebas no funcionales — OWASP Top 10 (Pytest)

| Categoría OWASP | Prueba | Verifica |
|-------------------|--------|-----------|
| A01 — Broken Access Control | `test_a01_admin_endpoints_reject_regular_users` | Un usuario no-admin recibe 403 en endpoints administrativos |
| A01 — Broken Access Control | `test_a01_cannot_delete_a_tree_you_do_not_own` | Un usuario no puede borrar árboles ajenos |
| A02 — Cryptographic Failures | `test_a02_password_is_never_returned_by_the_api` | El hash de contraseña nunca aparece en respuestas de la API |
| A02 — Cryptographic Failures | `test_a02_passwords_are_hashed_not_stored_in_plaintext` | Las contraseñas se almacenan con `pbkdf2_sha256`, nunca en texto plano |
| A03 — Injection | `test_a03_search_field_is_safe_against_sql_injection_payloads` | Un payload de inyección SQL en el buscador no rompe el sistema ni filtra datos |
| A04 — Insecure Design | `test_a04_registration_rejects_a_common_weak_password` | Contraseñas débiles/comunes son rechazadas en el registro |
| A05 — Security Misconfiguration | `test_a05_debug_defaults_to_false_when_env_var_is_absent` | `DEBUG` es `False` por defecto si la variable de entorno no está definida (falla de forma segura) |
| A07 — Auth Failures | `test_a07_protected_endpoints_require_authentication` | Peticiones anónimas a endpoints protegidos reciben 401 |
| A07 — Auth Failures | `test_a07_registration_is_rate_limited` | El endpoint de registro tiene límite de tasa configurado |

> **Nota:** la prueba A05 llevó a un hallazgo real corregido durante el desarrollo: el valor por defecto de `DEBUG` era `'True'` cuando la variable de entorno no estaba definida (fallo *abierto*, inseguro). Se corrigió a `'False'` por defecto (fallo *cerrado*, seguro) — ver `backend/core/settings.py`.

### 6.4 Análisis estático de seguridad (Bandit)

Comando ejecutado: `bandit -r . -x "./plantapp_venv,./staticfiles,./*/migrations"` desde `backend/`.

**Resultado sobre el código de aplicación** (`core/`, `plantapp/`, `users/`, excluyendo archivos de prueba): **0 hallazgos** de severidad media/alta.

Se identificaron y resolvieron 3 hallazgos reales durante el escaneo:

| Hallazgo | Archivo | Resolución |
|----------|---------|------------|
| `B310 urllib_urlopen` (posible inyección de esquema `file://`) | `users/emails.py` | Verificado como falso positivo: la URL es un literal fijo (`https://api.brevo.com/...`), nunca entrada de usuario. Documentado con `# nosec B310` y comentario justificativo. |
| `B105 hardcoded_password_string` | `plantapp/diagnostics.py` | Verificado como valor de prueba desechable (no es una credencial real). Documentado con `# nosec B105`. |
| `B110 try_except_pass` | `users/views.py` | Verificado como diseño de seguridad intencional: el endpoint de reenvío de verificación debe responder igual exista o no la cuenta, para evitar enumeración de usuarios. Documentado con comentario explicativo. |

El escaneo completo (incluyendo archivos de prueba) reporta 46 hallazgos de severidad **baja**, todos correspondientes a patrones esperados y benignos en código de testing (`assert` en pruebas, contraseñas de prueba hardcodeadas) — no representan riesgo real. Reporte completo disponible en `backend/bandit_report.txt`.

### 6.5 Trazabilidad requerimiento → prueba

| Requerimiento | Prueba(s) que lo verifican |
|----------------|------------------------------|
| RF-01, RNF-04 | `test_a07_registration_is_rate_limited`, `test_duplicate_email_rejected_case_insensitive` |
| RF-03 | `test_rejects_tree_without_photo`, panel QA #1 |
| RF-05 | `test_public_profile_is_case_insensitive_and_hides_email` |
| RF-06 | `test_like_toggle_adds_and_removes_like` |
| RF-07 | `test_user_can_only_delete_their_own_comment` |
| RF-08 | `test_leaderboard_orders_by_tree_count_descending` |
| RF-09, RNF-09 | `WeatherAsyncTests` (3 pruebas, ver `plantapp/tests.py`) |
| RF-10, RF-11 | `test_a01_admin_endpoints_reject_regular_users`, `test_a01_cannot_delete_a_tree_you_do_not_own` |
| RNF-01, RNF-02 | `test_a02_*`, `test_a03_*` |
| RNF-05, RNF-06, RNF-07 | `TreeAntiFraudTests` (9 pruebas, ver `plantapp/tests.py`), panel QA #3 |
| RNF-08 | Panel QA #6 |
| RNF-10 | Panel QA #5 |

---

## 7. Plan de gestión de cambios y mantenimiento del software

### 7.1 Flujo de control de versiones

El proyecto usa dos ramas permanentes en Git:

- **`develop`** — rama de trabajo activo. Todo cambio se desarrolla y prueba aquí primero.
- **`main`** — rama de producción. Cada push a `main` dispara automáticamente el redespliegue en Vercel (frontend) y Render (backend).

**Flujo estándar de un cambio:**
1. Desarrollar y probar localmente sobre `develop`.
2. Ejecutar la suite completa (`pytest` y/o `manage.py test`) — el cambio no avanza si algo falla.
3. Hacer commit descriptivo en `develop`.
4. Cuando el cambio está listo para producción: `git checkout main && git merge develop && git push`.
5. Verificar el despliegue en producción (logs de Render, prueba manual del flujo afectado).

Este flujo ya demostró su valor durante el proyecto: dos incidentes de producción (bloqueo de `createsuperuser` en el build, y bloqueo de SMTP saliente) se diagnosticaron y revirtieron sin afectar la rama estable de desarrollo.

### 7.2 Tipos de mantenimiento aplicados (clasificación ISO/IEC 14764)

| Tipo | Ejemplo real ocurrido en el proyecto |
|------|----------------------------------------|
| **Correctivo** | El *Build Command* de Render quedó con un paso de `createsuperuser` obsoleto tras la creación inicial del superusuario, causando fallos de build en cada deploy posterior. Se identificó vía logs y se corrigió eliminando el paso. |
| **Adaptivo** | Render bloquea conexiones SMTP salientes (política del proveedor de hosting). Se migró el transporte de correo de SMTP a una API HTTPS (Brevo), y finalmente se desactivó tras problemas de disponibilidad, adaptándose a la limitación del entorno sin perder el trabajo ya hecho (feature flag). |
| **Perfectivo** | Se agregaron reglas anti-fraude (radio geográfico, límite diario, foto obligatoria) no contempladas en el diseño original, tras detectar 244 registros de prueba no realistas en producción. |
| **Preventivo** | Se construyó la suite de pruebas automatizadas (38 pruebas Pytest) y el panel de QA específicamente para detectar regresiones antes de que lleguen a producción, no como reacción a un incidente. |

### 7.3 Gestión de solicitudes de cambio

1. **Identificación**: un cambio se origina por reporte de error, requerimiento nuevo, o hallazgo de una prueba/escaneo (ej. Bandit).
2. **Clasificación**: se determina el tipo (correctivo/adaptivo/perfectivo/preventivo) y su urgencia.
3. **Implementación en `develop`**, con pruebas automatizadas que cubran el cambio antes de fusionarlo.
4. **Validación**: ejecución de la suite completa + verificación manual del flujo afectado en el entorno local.
5. **Despliegue** a `main`, monitoreado vía logs de Render inmediatamente después del push.
6. **Rollback**: si un despliegue introduce una regresión, `git revert` del commit en `main` y nuevo push — el historial de commits atómicos (uno por cambio funcional) permite revertir con precisión sin perder trabajo no relacionado.

### 7.4 Mantenimiento preventivo continuo

- La suite de Pytest y el panel de QA deben ejecutarse antes de cada fusión a `main` (no automatizado aún vía CI; ejecución manual documentada como parte del flujo de trabajo).
- Bandit debe ejecutarse cuando se agreguen dependencias nuevas o código que maneje datos externos (entrada de usuario, llamadas HTTP salientes).
- Revisión periódica de dependencias desactualizadas (`pip list --outdated`, `npm outdated`) — pendiente de automatizar con Dependabot o similar.

### 7.5 Extensión futura recomendada (CI/CD)

Se recomienda incorporar GitHub Actions para ejecutar automáticamente `pytest` y `bandit` en cada *pull request* hacia `main`, bloqueando la fusión si alguna prueba falla o si Bandit reporta un hallazgo de severidad media/alta. Esto formalizaría el paso manual de validación descrito en 7.3 punto 4.

---

## 8. Resumen de cobertura de pruebas

| Categoría | Cantidad | Herramienta |
|-----------|----------|-------------|
| Funcionales (panel navegador, verificables en Network tab) | 3 | Peticiones HTTP reales (fetch/axios) |
| No funcionales (panel navegador) | 3 | Peticiones HTTP reales (fetch/axios) |
| Funcionales/integración (automatizadas) | 29 | Pytest + pytest-django |
| No funcionales — seguridad OWASP (automatizadas) | 9 | Pytest + pytest-django |
| Análisis estático de seguridad | 1 escaneo, 0 hallazgos sin resolver en código de app | Bandit |
| **Total pruebas ejecutables** | **44** | — |
