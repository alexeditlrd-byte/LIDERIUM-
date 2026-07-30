# Panel Finanzas — conexión con el Google Sheet "FINANZAS LIDERIUM"

Igual que el panel Comercial: la app no habla con la API de Sheets directamente, llama
a un Apps Script publicado como Web App que lee y escribe el spreadsheet real.

El script **no asume números de fila/columna fijos**: detecta las 3 secciones
(Flujo de Caja, Estado de Resultados, Balance General) buscando esos títulos, y dentro
de cada una detecta la fila de meses buscando nombres de mes en español. Así, aunque
agregues o quites filas en el Excel, el script las sigue encontrando bien. Las celdas
que tienen fórmula (los totales calculados) se marcan como no editables — no se pueden
sobrescribir desde la app.

## 1. Convertir el .xlsx en Hoja de cálculo de Google nativa

1. Abre `FINANZAS LIDERIUM` en Drive → **Abrir con Google Sheets**.
2. **Archivo → Guardar como Hojas de cálculo de Google** (crea una copia nativa editable).
3. Trabaja desde esa copia de aquí en adelante.

## 2. Pegar el Apps Script

En la copia nativa → **Extensiones → Apps Script** → borra `Código.gs` y pega:

```javascript
const MONTHS_ = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
const SECTION_DEFS_ = [
  { key: 'flujo', match: function (s) { return s.toUpperCase().indexOf('ESTADO DE FLUJO') === 0; } },
  { key: 'resultados', match: function (s) { return s.toUpperCase().indexOf('ESTADO DE RESULTADO') === 0; } },
  { key: 'balance', match: function (s) { return s.toUpperCase().indexOf('ESTADO DE BALANCE') === 0; } },
];

function setup() {
  const secret = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('SHARED_SECRET', secret);
  Logger.log('Secreto generado (cópialo, no se vuelve a mostrar): ' + secret);
}

function checkSecret_(body) {
  const expected = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
  if (!expected || body.secret !== expected) throw new Error('No autorizado');
}

function getFinanzasSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

function firstNonEmptyCell_(rowVals) {
  for (var c = 0; c < rowVals.length; c++) {
    var v = rowVals[c];
    if (v !== '' && v !== null && v !== undefined) return { col: c, text: String(v).trim() };
  }
  return null;
}

function isMonthHeaderRow_(rowVals) {
  var count = 0;
  for (var c = 0; c < rowVals.length; c++) {
    if (MONTHS_.indexOf(String(rowVals[c]).trim().toUpperCase()) !== -1) count++;
  }
  return count >= 3;
}

function readFinanzas_() {
  const sheet = getFinanzasSheet_();
  const values = sheet.getDataRange().getValues();
  const formulas = sheet.getDataRange().getFormulas();
  const numRows = values.length;
  const sections = { flujo: [], resultados: [], balance: [] };
  let currentSection = null;
  let monthCols = null;

  for (let r = 0; r < numRows; r++) {
    const rowVals = values[r];
    const first = firstNonEmptyCell_(rowVals);
    if (first) {
      let matched = null;
      for (let i = 0; i < SECTION_DEFS_.length; i++) {
        if (SECTION_DEFS_[i].match(first.text)) { matched = SECTION_DEFS_[i].key; break; }
      }
      if (matched) { currentSection = matched; monthCols = null; continue; }
    }
    if (!currentSection) continue;
    if (isMonthHeaderRow_(rowVals)) {
      monthCols = [];
      for (let c = 0; c < rowVals.length; c++) {
        const t = String(rowVals[c]).trim().toUpperCase();
        if (MONTHS_.indexOf(t) !== -1) monthCols.push({ col: c, label: String(rowVals[c]).trim() });
      }
      continue;
    }
    if (!monthCols || !first) continue;
    const cells = monthCols.map(function (mc) {
      const raw = values[r][mc.col];
      const formula = formulas[r][mc.col];
      return {
        col: mc.col + 1,
        month: mc.label,
        value: (raw === '' || raw === null || raw === undefined) ? '' : (typeof raw === 'number' ? raw : String(raw)),
        editable: !formula,
      };
    });
    sections[currentSection].push({ row: r + 1, label: first.text, cells: cells });
  }
  return sections;
}

function doPost(e) {
  let out;
  try {
    const body = JSON.parse(e.postData.contents);
    checkSecret_(body);

    if (body.action === 'list') {
      out = Object.assign({ success: true }, readFinanzas_());

    } else if (body.action === 'updateCell') {
      const sheet = getFinanzasSheet_();
      const range = sheet.getRange(body.row, body.col);
      if (range.getFormula()) throw new Error('No se puede editar una celda con fórmula.');
      const num = Number(body.value);
      range.setValue(isNaN(num) || body.value === '' ? body.value : num);
      out = { success: true };

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

Función `setup` seleccionada → **Ejecutar** → acepta permisos → **Registro de ejecución** →
copia el secreto. No lo vuelvas a correr después (regenera el secreto y desincroniza).

## 4. Publicar como Web App

**Implementar → Nueva implementación** → tipo **Aplicación web** → Ejecutar como
**Yo** → Quién tiene acceso **Cualquier persona** → **Implementar** → copia la URL
que termina en `/exec`.

## 5. Conectar con Vercel

Agrega estas dos variables en **Vercel → Settings → Environment Variables**
(Production, Preview y Development) y haz **Redeploy**:

```
GOOGLE_FINANZAS_WEBHOOK_URL=<la URL que termina en /exec>
GOOGLE_FINANZAS_WEBHOOK_SECRET=<el secreto del paso 3>
```
