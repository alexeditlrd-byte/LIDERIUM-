// Integración directa con la API de Google Calendar (OAuth de la cuenta real,
// vía refresh token) para crear/editar/cancelar reuniones con link de Meet.
// Reemplaza al Apps Script que se usaba antes para esto: era lento (viaje
// extra a los servidores de Apps Script) y a veces devolvía HTML en vez de
// JSON, dejando el link de Meet vacío.

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_ID = 'primary';
const TIME_ZONE = 'America/Lima';

async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Calendar no está configurado (faltan credenciales OAuth)');
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'No se pudo renovar el token de Google Calendar');
  return data.access_token as string;
}

interface CreateEventInput {
  title: string;
  startTime: string; // ISO
  durationMinutes: number;
  guestEmail: string;
  description?: string;
}

export async function createCalendarEvent(input: CreateEventInput): Promise<{ eventId: string; meetLink: string }> {
  const accessToken = await getAccessToken();
  const start = new Date(input.startTime);
  const end = new Date(start.getTime() + input.durationMinutes * 60000);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: input.title,
        description: input.description ?? '',
        start: { dateTime: start.toISOString(), timeZone: TIME_ZONE },
        end: { dateTime: end.toISOString(), timeZone: TIME_ZONE },
        attendees: input.guestEmail ? [{ email: input.guestEmail }] : [],
        conferenceData: {
          createRequest: {
            requestId: `liderium-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'No se pudo crear el evento en Google Calendar');
  return { eventId: data.id as string, meetLink: (data.hangoutLink as string) ?? '' };
}

interface UpdateEventInput {
  startTime: string; // ISO
  durationMinutes: number;
}

export async function updateCalendarEvent(eventId: string, input: UpdateEventInput): Promise<void> {
  const accessToken = await getAccessToken();
  const start = new Date(input.startTime);
  const end = new Date(start.getTime() + input.durationMinutes * 60000);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events/${eventId}?sendUpdates=all`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start: { dateTime: start.toISOString(), timeZone: TIME_ZONE },
        end: { dateTime: end.toISOString(), timeZone: TIME_ZONE },
      }),
    }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || 'No se pudo actualizar el evento en Google Calendar');
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const accessToken = await getAccessToken();
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events/${eventId}?sendUpdates=all`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok && res.status !== 410 && res.status !== 404) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || 'No se pudo cancelar el evento en Google Calendar');
  }
}
