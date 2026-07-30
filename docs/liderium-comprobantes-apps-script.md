# Apps Script LIDERIUM_COMPROBANTES — Calendar / Meet / Drive

Este es el proyecto de Apps Script (fuera de cualquier Sheet, standalone) que:
- Crea carpetas y sube comprobantes/entregables a Drive.
- Crea, reprograma y cancela reuniones de Google Calendar con link de Meet automático.

Referenciado desde la app vía la variable de entorno `GOOGLE_SCRIPT_URL` en Vercel.

## Acciones que maneja `doPost`

- `createFolder` — crea/reusa una carpeta de cliente en Drive.
- `createMeeting` — crea el evento de Calendar con Google Meet, invita al responsable.
- `updateMeeting` — reprograma un evento existente (mismo link de Meet).
- `deleteMeeting` — cancela un evento existente (notifica al invitado).
- `uploadEntregable` — sube un archivo del equipo al cliente.
- (default) — sube un comprobante de pago del cliente al equipo.

## Requisito: servicio avanzado "Calendar API"

En el editor de Apps Script → **Servicios** → **+** → agregar **Calendar API**.
Sin esto, `Calendar.Events.*` no existe y todo lo relacionado a reuniones falla.

## Código completo

```javascript
var COMPROBANTES_ROOT = '1YqpUbnL0O7ghs18GCpExknLvtL8LhDGK';
var ENTREGABLES_ROOT  = '1VP4-l_dn7OXREjYH0FL9BUeZl4gwwLcf';

function slugify(name) {
  return name.toLowerCase()
    .replace(/[áàä]/g,'a').replace(/[éèë]/g,'e')
    .replace(/[íìï]/g,'i').replace(/[óòö]/g,'o')
    .replace(/[úùü]/g,'u').replace(/ñ/g,'n')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

function getOrCreateFolder(rootId, folderName) {
  var root = DriveApp.getFolderById(rootId);
  var found = root.getFoldersByName(folderName);
  return found.hasNext() ? found.next() : root.createFolder(folderName);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // ── Crear carpeta de cliente (al crear cuenta) ──
    if (data.action === 'createFolder') {
      var folder = getOrCreateFolder(COMPROBANTES_ROOT, data.clientName || data.clientSlug);
      return ok({ folderId: folder.getId() });
    }

    // ── Crear reunión en Google Calendar con Meet automático ──
    if (data.action === 'createMeeting') {
      var start = new Date(data.startTime);
      var end   = new Date(start.getTime() + (data.durationMinutes || 45) * 60000);
      var eventResource = {
        summary: data.title,
        description: data.description || '',
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        conferenceData: {
          createRequest: {
            requestId: Utilities.getUuid(),
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        }
      };
      if (data.guestEmail) eventResource.attendees = [{ email: data.guestEmail }];
      var created = Calendar.Events.insert(eventResource, 'primary', { conferenceDataVersion: 1, sendUpdates: 'all' });
      return ok({ meetLink: created.hangoutLink || '', eventId: created.id });
    }

    // ── Reprogramar una reunión existente ──
    if (data.action === 'updateMeeting') {
      var start = new Date(data.startTime);
      var end   = new Date(start.getTime() + (data.durationMinutes || 45) * 60000);
      var patch = { start: { dateTime: start.toISOString() }, end: { dateTime: end.toISOString() } };
      var updated = Calendar.Events.patch(patch, 'primary', data.eventId, { sendUpdates: 'all' });
      return ok({ meetLink: updated.hangoutLink || '' });
    }

    // ── Cancelar una reunión existente ──
    if (data.action === 'deleteMeeting') {
      Calendar.Events.remove('primary', data.eventId, { sendUpdates: 'all' });
      return ok({});
    }

    // ── Subir entregable (del equipo al cliente) ──
    if (data.action === 'uploadEntregable') {
      var clientFolderName = data.clientName || data.clientSlug;
      var folder = getOrCreateFolder(ENTREGABLES_ROOT, clientFolderName);
      var decoded = Utilities.base64Decode(data.fileData);
      var blob    = Utilities.newBlob(decoded, data.mimeType || 'application/octet-stream', data.fileName);
      var file    = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return ok({
        fileId:       file.getId(),
        link:         file.getUrl(),
        downloadLink: 'https://drive.google.com/uc?id=' + file.getId() + '&export=download'
      });
    }

    // ── Subir comprobante de pago (del cliente al equipo) ──
    var clientFolder = getOrCreateFolder(COMPROBANTES_ROOT, data.clientName || data.clientSlug);
    var mes = data.mes || 'Sin-fecha';
    var mesFolder;
    var existing = clientFolder.getFoldersByName(mes);
    mesFolder = existing.hasNext() ? existing.next() : clientFolder.createFolder(mes);
    var decoded = Utilities.base64Decode(data.fileData);
    var blob    = Utilities.newBlob(decoded, data.mimeType || 'application/octet-stream', data.fileName);
    var file    = mesFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return ok({
      fileId: file.getId(),
      link:   file.getUrl(),
      name:   file.getName()
    });

  } catch(err) {
    return error(err.toString());
  }
}

function doGet(e) {
  try {
    var type      = (e.parameter && e.parameter.type)       || 'comprobantes';
    var clientSlug = (e.parameter && e.parameter.clientSlug) || '';

    // ── Listar entregables ──
    if (type === 'entregables') {
      var result = [];
      var root   = DriveApp.getFolderById(ENTREGABLES_ROOT);
      var cFolders = root.getFolders();
      while (cFolders.hasNext()) {
        var cf   = cFolders.next();
        var slug = slugify(cf.getName());
        if (clientSlug && slug !== clientSlug) continue;
        var files = cf.getFiles();
        while (files.hasNext()) {
          var f = files.next();
          result.push({
            clientSlug:   slug,
            clientName:   cf.getName(),
            fileId:       f.getId(),
            fileName:     f.getName(),
            link:         f.getUrl(),
            downloadLink: 'https://drive.google.com/uc?id=' + f.getId() + '&export=download',
            uploadedAt:   f.getDateCreated().toISOString(),
            mimeType:     f.getMimeType()
          });
        }
      }
      return okList({ entregables: result });
    }

    // ── Listar comprobantes (default) ──
    var result = [];
    var root   = DriveApp.getFolderById(COMPROBANTES_ROOT);
    var cFolders = root.getFolders();
    while (cFolders.hasNext()) {
      var cf     = cFolders.next();
      var cSlug  = slugify(cf.getName());
      var mFolders = cf.getFolders();
      while (mFolders.hasNext()) {
        var mf    = mFolders.next();
        var files = mf.getFiles();
        while (files.hasNext()) {
          var f = files.next();
          result.push({
            clientSlug: cSlug,
            clientName: cf.getName(),
            mes:        mf.getName(),
            fileId:     f.getId(),
            fileName:   f.getName(),
            link:       f.getUrl(),
            uploadedAt: f.getDateCreated().toISOString(),
            mimeType:   f.getMimeType()
          });
        }
      }
    }
    return okList({ comprobantes: result });

  } catch(err) {
    return error(err.toString());
  }
}

// ── Helpers ──
function ok(extra) {
  return ContentService
    .createTextOutput(JSON.stringify(Object.assign({ success: true }, extra)))
    .setMimeType(ContentService.MimeType.JSON);
}
function okList(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(Object.assign({ success: true }, obj)))
    .setMimeType(ContentService.MimeType.JSON);
}
function error(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## Requisito en Supabase

La tabla `meetings` necesita una columna `event_id` (texto) para poder reprogramar/cancelar
después de creada:

```sql
alter table meetings add column if not exists event_id text;
```
