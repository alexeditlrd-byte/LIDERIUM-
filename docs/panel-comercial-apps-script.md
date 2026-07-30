# Panel Comercial — conexión con el Google Sheet de leads

El panel comercial (pestaña **Comercial** dentro de Staff) guarda y lee los leads
directamente de tu spreadsheet `CRM .xlsx` en Drive. La app de Next.js no habla con la
API de Google Sheets: llama a un **Google Apps Script publicado como Web App**, que vive
dentro de la propia hoja de cálculo. Así no hace falta crear ninguna cuenta de servicio
de Google Cloud.

Para no tocar la pestaña "DASHBOARD LIDERIUM CRM" (tiene miles de filas con fórmulas de
fecha autogeneradas hasta 2028), el script trabaja en una pestaña nueva y separada
llamada **`Leads_App`**, que se crea sola la primera vez que corres el script. Esa
pestaña es la fuente de verdad para el panel — puedes verla y editarla a mano también,
está en el mismo archivo.

## 1. Convertir el .xlsx en una Hoja de cálculo de Google nativa

Apps Script solo se puede vincular a una Hoja de cálculo de Google nativa, no a un
archivo `.xlsx` subido tal cual.

1. Abre el archivo `CRM .xlsx` en Drive.
2. Arriba aparece un botón **"Abrir con Google Sheets"** — haz clic ahí.
3. Ya con la vista previa abierta, ve a **Archivo → Guardar como Hojas de cálculo de
   Google**. Esto crea una copia nativa editable en la misma carpeta (el `.xlsx`
   original queda intacto).
4. Trabaja siempre desde esa copia nueva a partir de ahora.

## 2. Pegar el Apps Script

1. En la copia nativa, ve a **Extensiones → Apps Script**.
2. Borra el contenido de `Código.gs` y pega el script de abajo.
3. Guarda el proyecto (ícono de disquete).

```javascript
const SHEET_NAME = 'Leads_App';
const HEADERS = [
  'id', 'nombre', 'instagram', 'numero', 'tipoInfoproductor', 'nicho', 'plataformas',
  'nps', 'plan', 'faseVenta', 'probabilidad', 'responsable', 'fechaInicio',
  'fechaRenovacion', 'precio', 'abono', 'deuda', 'estado', 'prioridad', 'observacion',
];

function setup() {
  const secret = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('SHARED_SECRET', secret);
  getSheet_();
  Logger.log('Secreto generado (cópialo, no se vuelve a mostrar): ' + secret);
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  // fechaInicio y fechaRenovacion son las columnas 13 y 14 — se guardan como
  // "d/m/aaaa" en texto plano. Si Sheets detecta el patrón de fecha y no hay un
  // formato de columna explícito, convierte la celda a un valor Date real y
  // rompe el parseo del panel. Forzamos texto plano en esas dos columnas.
  sheet.getRange(2, 13, Math.max(sheet.getMaxRows() - 1, 1), 2).setNumberFormat('@');
  return sheet;
}

function formatDate_(v) {
  if (v instanceof Date) return v.getDate() + '/' + (v.getMonth() + 1) + '/' + v.getFullYear();
  return v || '';
}

function rowToLead_(row) {
  const lead = {};
  HEADERS.forEach((h, i) => { lead[h] = row[i]; });
  lead.fechaInicio = formatDate_(lead.fechaInicio);
  lead.fechaRenovacion = formatDate_(lead.fechaRenovacion);
  lead.precio = Number(lead.precio) || 0;
  lead.abono = Number(lead.abono) || 0;
  lead.deuda = lead.precio - lead.abono;
  return lead;
}

function leadToRow_(lead) {
  return HEADERS.map(h => (h === 'deuda' ? (Number(lead.precio) || 0) - (Number(lead.abono) || 0) : (lead[h] ?? '')));
}

function checkSecret_(body) {
  const expected = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
  if (!expected || body.secret !== expected) throw new Error('No autorizado');
}

function doPost(e) {
  let out;
  try {
    const body = JSON.parse(e.postData.contents);
    checkSecret_(body);
    const sheet = getSheet_();

    if (body.action === 'list') {
      const values = sheet.getDataRange().getValues();
      const leads = values.slice(1).filter(r => r[0]).map(rowToLead_);
      out = { leads };

    } else if (body.action === 'create') {
      const id = String(new Date().getTime());
      const lead = Object.assign({ id }, body.lead);
      sheet.appendRow(leadToRow_(lead));
      out = { lead: rowToLead_(leadToRow_(lead)) };

    } else if (body.action === 'update') {
      const values = sheet.getDataRange().getValues();
      const idx = values.findIndex((r, i) => i > 0 && String(r[0]) === String(body.id));
      if (idx < 1) throw new Error('Lead no encontrado: ' + body.id);
      const current = rowToLead_(values[idx]);
      const updated = Object.assign({}, current, body.patch, { id: current.id });
      const rowNum = idx + 1;
      sheet.getRange(rowNum, 1, 1, HEADERS.length).setValues([leadToRow_(updated)]);
      out = { lead: rowToLead_(leadToRow_(updated)) };

    } else {
      throw new Error('Acción desconocida: ' + body.action);
    }
  } catch (err) {
    out = { error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
```

## 3. Generar el secreto

1. En el editor de Apps Script, en el selector de funciones (arriba, junto al botón ▶),
   elige `setup` y dale a **Ejecutar**.
2. La primera vez pedirá autorización — acepta los permisos (es tu propia hoja).
3. Ve a **Ejecución → Registros** (o `Ver → Registros`) y copia el secreto que se
   imprimió. Solo se genera una vez; si lo pierdes, vuelve a correr `setup` para generar
   uno nuevo.
4. Esto también crea la pestaña `Leads_App` con los encabezados correctos.

## 4. Publicar como Web App

1. Botón **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. "Ejecutar como": **Yo (tu cuenta)**.
4. "Quién tiene acceso": **Cualquier usuario**.
5. Implementar → copia la **URL de la aplicación web** que te da (termina en `/exec`).

## 5. Conectar la app de Liderium

Con la URL y el secreto, agrega estas dos variables de entorno en el proyecto de
Vercel (**Project Settings → Environment Variables**, en Production y Preview) y
redeploy:

```
GOOGLE_LEADS_WEBHOOK_URL=<la URL que termina en /exec>
GOOGLE_LEADS_WEBHOOK_SECRET=<el secreto del paso 3>
```

Para probar en local, crea un `.env.local` (no se sube a git) en la raíz del proyecto
con esas mismas dos líneas.

Una vez configuradas, la pestaña **Comercial** deja de mostrar el aviso de "no
conectado" y empieza a leer/escribir leads reales en la pestaña `Leads_App` de tu
Google Sheet.
