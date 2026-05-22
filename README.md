# 🏛️ Sistema de Licencias Municipales — Municipalidad Provincial de Trujillo

> **MVP de Otorgamiento Automatizado de Licencias Municipales de Funcionamiento**  
> Stack: Next.js 14 · PostgreSQL (Supabase) · Prisma ORM · NextAuth.js · MercadoPago Sandbox

---

## 🚀 Arranque en 2 Pasos

```bash
# Paso 1: Configurar variables de entorno
# Editar .env.local con tus credenciales de Supabase, MercadoPago y ApisPerú

# Paso 2: Levantar el proyecto
npm install
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts     # Carga datos demo
npm run dev                # http://localhost:3000
```

---

## 👤 Cuentas de Acceso (Demo)

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Administrador | admin@demo.pe | Demo1234! |
| Inspector | inspector@demo.pe | Demo1234! |
| Contribuyente | contribuyente@demo.pe | Demo1234! |

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    INTERNET / VERCEL                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              NEXT.JS 14 (App Router)              │   │
│  │                                                   │   │
│  │  Frontend (React)    ←→   API Routes (Node.js)   │   │
│  │  ─────────────────         ──────────────────     │   │
│  │  /login               /api/sunat/ruc              │   │
│  │  /contribuyente/*     /api/tramites               │   │
│  │  /inspector/*         /api/pagos/webhook          │   │
│  │  /admin/*             /api/inspecciones           │   │
│  │  /verificar/[codigo]  /api/licencia/[id]/pdf      │   │
│  └────────────┬─────────────────────────────────────┘   │
│               │                                         │
│  ┌────────────▼─────────┐  ┌────────────────────────┐   │
│  │  PostgreSQL (Supabase)│  │   Supabase Storage     │   │
│  │  ─────────────────── │  │   ─────────────────    │   │
│  │  usuarios            │  │   /documentos/         │   │
│  │  negocios (SUNAT)    │  │   planos de locales    │   │
│  │  tramites            │  │   actas inspección     │   │
│  │  pagos               │  └────────────────────────┘   │
│  │  inspecciones        │                               │
│  │  documentos          │  ┌────────────────────────┐   │
│  │  historial_infra     │  │   APIs Externas        │   │
│  └──────────────────────┘  │   ─────────────────    │   │
│                            │   SUNAT (apis.net.pe)  │   │
│                            │   MercadoPago Sandbox  │   │
│                            └────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Datos Principal

```
CONTRIBUYENTE                 SISTEMA                      INSPECTOR
     │                           │                              │
     │── Ingresa RUC ──────────►│                              │
     │                    ┌─────▼─────┐                       │
     │                    │ API SUNAT  │ ← apis.net.pe         │
     │                    │ Valida:    │                       │
     │                    │ • ACTIVO   │                       │
     │                    │ • HABIDO   │                       │
     │                    │ • TRUJILLO │                       │
     │                    └─────┬─────┘                       │
     │◄─ Razón Social + Dir. ───┘                              │
     │                           │                              │
     │── Sube Plano ───────────►│ → Supabase Storage          │
     │                           │                              │
     │── Solicita Pago ────────►│                              │
     │                    ┌─────▼──────────────┐               │
     │                    │ MercadoPago Sandbox │               │
     │                    │ Preferencia S/. 180 │               │
     │                    └─────┬──────────────┘               │
     │◄─ URL de Pago ───────────┘                              │
     │                           │                              │
     │── Paga en MP ───────────►│ (webhook automático)         │
     │                    ┌─────▼─────────────────────────┐    │
     │                    │ Webhook: pago confirmado        │    │
     │                    │ → Estado: EN_INSPECCION         │    │
     │                    │ → Agenda inspección (2 días hábiles)│
     │                    └─────┬─────────────────────────┘    │
     │                           │                              │
     │                           │──── Notificación ──────────►│
     │                           │                              │
     │                           │◄── Registra resultado ───────│
     │                    ┌─────▼──────────────────────────┐   │
     │                    │ Máquina de Estados              │   │
     │                    │                                 │   │
     │                    │  CONFORME → APROBADO           │   │
     │                    │    → Genera PDF + QR            │   │
     │                    │    → Vigencia 1 año             │   │
     │                    │                                 │   │
     │                    │  OBSERVADO → SEGUNDA_INSP.      │   │
     │                    │    → Agenda visita #2           │   │
     │                    │    → Límite: 30 días hábiles    │   │
     │                    │                                 │   │
     │                    │  RECHAZADO (v2) → NEGADO        │   │
     │                    │    → Proceso termina            │   │
     │                    │    → Nuevo pago para reiniciar  │   │
     │                    └─────┬──────────────────────────┘   │
     │                           │                              │
     │◄─ PDF Licencia ──────────┘ (si APROBADO)                │
```

---

## 📊 Modelo de Base de Datos

```sql
-- ESTADOS DEL TRÁMITE
INICIADO → DOCUMENTOS_PENDIENTES → PAGADO → EN_INSPECCION
  └─ (pago ok) → EN_INSPECCION → (conforme v1) → APROBADO ✅
                              └─ (observado v1) → SEGUNDA_INSPECCION
                                                → (conforme v2) → APROBADO ✅
                                                └─ (rechazado v2) → NEGADO ❌

-- TABLAS PRINCIPALES
usuarios            (id, email, password_hash, rol, nombre, dni)
negocios            (id, ruc, razon_social, domicilio_fiscal, activo, habido)
tramites            (id, negocio_id, estado, codigo_licencia, qr_data, licencia_vigente_hasta)
pagos               (id, tramite_id, monto=180, referencia_pasarela, estado_pago)
inspecciones        (id, tramite_id, inspector_id, fecha_programada, resultado, numero_visita)
documentos          (id, tramite_id, tipo, url, vigente)
historial_infraestructura (id, tramite_id, tiene_cambios, declarado_por)
fechas_no_habiles   (id, fecha, motivo)  -- Para cálculo de 30 días hábiles
```

---

## 📡 API Endpoints

| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| GET | `/api/sunat/ruc?ruc=20XXXXXXXXX` | Consulta RUC en SUNAT | Todos |
| POST | `/api/sunat/ruc` | Registra negocio validado | Contribuyente |
| POST | `/api/tramites` | Inicia nuevo trámite | Contribuyente |
| GET | `/api/tramites` | Lista mis trámites | Contribuyente |
| POST | `/api/pagos/crear-preferencia` | Crea checkout MercadoPago | Contribuyente |
| POST | `/api/pagos/webhook` | Callback de pago (MP) | Sistema |
| POST | `/api/documentos/upload` | Sube plano del local | Contribuyente |
| POST | `/api/inspecciones/[id]/resultado` | Registra resultado visita | Inspector |
| GET | `/api/licencia/[id]/pdf` | Descarga licencia PDF | Contribuyente |
| GET | `/verificar/[codigo]` | Verifica QR (público) | Público |
| POST | `/api/auth/registro` | Crea cuenta contribuyente | Público |

---

## ⚙️ Variables de Entorno Requeridas

```env
DATABASE_URL=postgresql://postgres:[pass]@db.[ref].supabase.co:5432/postgres
NEXTAUTH_SECRET=[32 chars random]
NEXTAUTH_URL=https://[tu-dominio].vercel.app
APIS_PERU_TOKEN=[token de apis.net.pe]
MERCADOPAGO_ACCESS_TOKEN=TEST-[token]
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-[key]
NEXT_PUBLIC_APP_URL=https://[tu-dominio].vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key]
SUPABASE_SERVICE_ROLE_KEY=[service role key]
```

---

## 🌐 Despliegue en Producción

### 1. Supabase (Base de datos + Storage)
```bash
# En supabase.com → New Project → La Libertad region
# Copiar DATABASE_URL de Settings → Database
# Crear bucket "documentos" en Storage → Public

npx prisma migrate deploy
npx tsx prisma/seed.ts
```

### 2. Vercel
```bash
# vercel.com → New Project → Import desde GitHub
# Configurar todas las variables de entorno
# Deploy automático en cada push
git add . && git commit -m "feat: MVP licencias municipales"
git push origin main
# ✅ URL lista en ~3 minutos
```

---

## 🧪 Tarjeta de Prueba MercadoPago (Sandbox)

| Campo | Valor |
|-------|-------|
| Número | `4509 9535 6623 3704` |
| Vencimiento | `11/25` (cualquier fecha futura) |
| CVV | `123` |
| Nombre | `APRO` (para aprobar) / `OTHE` (para rechazar) |

---

## 🔐 Reglas de Negocio Implementadas

1. ✅ **Ámbito geográfico**: Solo RUC con domicilio fiscal en Provincia de Trujillo, La Libertad
2. ✅ **Validación SUNAT real**: estado=ACTIVO + condición=HABIDO (via apis.net.pe)
3. ✅ **Pago obligatorio**: S/. 180.00 vía MercadoPago con webhook de confirmación
4. ✅ **Inspección automática**: Se agenda 2 días hábiles tras confirmar pago
5. ✅ **Dos visitas máximo**: Visita #1 observada → Visita #2 en máx. 30 días hábiles
6. ✅ **NEGADO DEFINITIVO**: En segunda visita rechazada, proceso muere, debe pagar de nuevo
7. ✅ **Licencia PDF con QR**: Solo si estado=APROBADO, con código único verificable
8. ✅ **Vigencia 1 año**: Fecha de vencimiento automática al aprobar
9. ✅ **Renovación con un clic**: Si declara mismo local sin cambios, se acepta
10. ✅ **Cambios de infraestructura**: Bloquea renovación, obliga trámite nuevo con advertencia

---

## 📁 Estructura del Proyecto

```
licencias-municipales-trujillo/
├── prisma/
│   ├── schema.prisma       # Modelo completo de BD
│   └── seed.ts             # Datos demo (4 trámites en distintos estados)
├── src/
│   ├── app/
│   │   ├── page.tsx                              # Landing page
│   │   ├── login/page.tsx                        # Login
│   │   ├── registro/page.tsx                     # Registro
│   │   ├── contribuyente/
│   │   │   ├── dashboard/page.tsx                # Dashboard contribuyente
│   │   │   ├── nuevo-tramite/page.tsx            # Stepper RUC → Docs → Pago
│   │   │   └── tramite/[id]/page.tsx             # Detalle + timeline
│   │   ├── inspector/
│   │   │   └── agenda/page.tsx                   # Agenda + formulario resultado
│   │   ├── admin/
│   │   │   └── dashboard/page.tsx                # Panel admin + métricas
│   │   ├── verificar/[codigo]/page.tsx           # Verificación QR pública
│   │   └── api/
│   │       ├── sunat/ruc/route.ts                # 🔑 Integración SUNAT
│   │       ├── tramites/route.ts                 # CRUD trámites
│   │       ├── pagos/
│   │       │   ├── crear-preferencia/route.ts    # 💳 Checkout MP
│   │       │   └── webhook/route.ts              # 🔔 Callback MP
│   │       ├── inspecciones/[id]/resultado/      # 📋 Resultado visita
│   │       ├── documentos/upload/route.ts        # 📁 Subida planos
│   │       └── licencia/[id]/pdf/route.ts        # 📄 PDF + QR
│   └── lib/
│       ├── prisma.ts           # Singleton Prisma
│       ├── sunat.ts            # 🔑 Cliente SUNAT (validación completa)
│       ├── mercadopago.ts      # 💳 Cliente MercadoPago
│       ├── tramite-machine.ts  # ⚙️ Máquina de estados
│       ├── dias-habiles.ts     # 📅 Cálculo 30 días hábiles
│       └── pdf-generator.ts    # 📄 Generación PDF + QR
└── README.md                   # Este archivo
```

---

*Sistema desarrollado como MVP para el Parcial de Metodologías Ágiles.*  
*Municipalidad Provincial de Trujillo — Gerencia de Desarrollo Económico, 2025.*
