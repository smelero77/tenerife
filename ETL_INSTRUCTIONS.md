# ETL Pipeline - INE Nomenclátor 2025 (Tenerife)

## Descripción

Pipeline ETL para ingerir datos del CSV del INE Nomenclátor 2025, filtrando únicamente los 31 municipios de la isla de Tenerife.

## Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://atzwjqyktumcxyruiobk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

# ETL Admin Token (para autenticación del endpoint)
ETL_ADMIN_TOKEN=tu_token_seguro_aqui
```

### Cómo obtener las credenciales de Supabase:

1. **NEXT_PUBLIC_SUPABASE_URL**: URL de tu proyecto Supabase
   - Se encuentra en: Supabase Dashboard → Settings → API → Project URL

2. **SUPABASE_SERVICE_ROLE_KEY**: Service Role Key (NUNCA exponer al cliente)
   - Se encuentra en: Supabase Dashboard → Settings → API → service_role key
   - ⚠️ **ADVERTENCIA**: Esta clave tiene permisos completos. Úsala solo en el servidor.

3. **ETL_ADMIN_TOKEN**: Token personalizado para proteger el endpoint
   - Genera un token seguro aleatorio (ej: `openssl rand -hex 32`)

## Cómo Ejecutar el Pipeline

### 1. Asegúrate de que el CSV esté en la ubicación correcta:

```
data/raw/Nomenclator_Semicolon_20260131_190532.csv
```

### 2. Inicia el servidor de desarrollo:

```bash
npm run dev
```

### 3. Ejecuta el pipeline mediante una petición HTTP:

#### Usando curl (Windows PowerShell):

```powershell
$headers = @{
    "x-etl-admin-token" = "tu_token_aqui"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "http://localhost:3000/api/admin/etl/run" -Method POST -Headers $headers
```

#### Usando curl (Linux/Mac):

```bash
curl -X POST http://localhost:3000/api/admin/etl/run \
  -H "x-etl-admin-token: tu_token_aqui" \
  -H "Content-Type: application/json"
```

#### Usando Postman o similar:

- **URL**: `POST http://localhost:3000/api/admin/etl/run`
- **Headers**:
  - `x-etl-admin-token`: `tu_token_aqui`
  - `Content-Type`: `application/json`

## Respuesta del Endpoint

### Éxito (200):

```json
{
  "success": true,
  "message": "ETL pipeline completed successfully",
  "runId": "uuid-del-run",
  "summary": {
    "totalRowsProcessed": 3690,
    "tenerifeRows": 1234,
    "skippedRows": 2456,
    "bronzeInserted": 1234,
    "silverInserted": 1234,
    "municipiosInserted": 31,
    "entidadesInserted": 456,
    "localidadesInserted": 778,
    "populationFactsInserted": 778,
    "snapshotsInserted": 31
  },
  "steps": [
    {
      "stepName": "parse_csv_filter_tenerife",
      "duration": 1234,
      "success": true,
      "stats": { ... }
    },
    ...
  ]
}
```

### Error (401 - No autorizado):

```json
{
  "error": "Unauthorized: invalid or missing x-etl-admin-token"
}
```

### Error (500 - Error del pipeline):

```json
{
  "success": false,
  "message": "ETL pipeline failed",
  "runId": "uuid-del-run",
  "summary": { ... },
  "steps": [ ... ]
}
```

## Flujo del Pipeline

El pipeline ejecuta los siguientes pasos en orden:

1. **parse_csv_filter_tenerife**: Lee el CSV y filtra solo filas de Tenerife
2. **load_bronze**: Inserta filas crudas en `bronze_nomenclator_raw`
3. **load_silver**: Inserta datos normalizados en `silver_nomenclator_units`
4. **load_municipios**: Upsert de municipios en `dim_municipio`
5. **load_entidades_singulares**: Upsert de ES en `dim_entidad_singular`
6. **load_localidades**: Upsert de NUC/DIS en `dim_localidad`
7. **load_population_facts**: Upsert de población en `fact_population_localidad`
8. **load_municipio_snapshots**: Upsert de agregaciones en `agg_municipio_snapshot`

## Seguridad

- El endpoint está protegido con el header `x-etl-admin-token`
- Usa `SUPABASE_SERVICE_ROLE_KEY` solo en el servidor (nunca en el cliente)
- El pipeline es idempotente: puede ejecutarse múltiples veces sin duplicar datos

## Monitoreo

Cada ejecución del pipeline crea registros en:
- `etl_runs`: Ejecución principal del pipeline
- `etl_run_steps`: Pasos individuales con duraciones y errores

Puedes consultar estos registros en Supabase para monitorear el estado de las ejecuciones.

## Municipios de Tenerife Procesados

El pipeline procesa únicamente estos 31 códigos INE:
- 38001, 38004, 38005, 38006, 38010, 38011, 38012, 38015
- 38017, 38018, 38019, 38020, 38022, 38023, 38025, 38026
- 38028, 38031, 38032, 38034, 38035, 38038, 38039, 38040
- 38041, 38042, 38043, 38044, 38046, 38051, 38052

Cualquier fila con un código INE diferente será **ignorada completamente** (ni siquiera se guarda en Bronze).
