interface RucPeruResponse {
  ruc: string;
  razon_social: string;
  direccion: string;
  estado: string;
  condicion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  tipo_contribuyente: string;
}

interface CrucToken {
  cruc_token: string;
  cruc_sig: string;
  expires_at: number;
}

const AJAX_URL = 'https://rucperu.com/wp-admin/admin-ajax.php';
const DNI_PAGE = 'https://rucperu.com/ruc-por-dni/';
const RUC_PAGE = 'https://rucperu.com/consulta-ruc/';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const FIELD_MAP: Record<string, keyof RucPeruResponse> = {
  'ruc': 'ruc',
  'nro. ruc': 'ruc',
  'número de ruc': 'ruc',
  'razón social': 'razon_social',
  'razon social': 'razon_social',
  'nombre': 'razon_social',
  'nombre del contribuyente': 'razon_social',
  'domicilio fiscal': 'direccion',
  'dirección': 'direccion',
  'direccion': 'direccion',
  'domicilio': 'direccion',
  'estado': 'estado',
  'estado del contribuyente': 'estado',
  'condición': 'condicion',
  'condicion': 'condicion',
  'condición del contribuyente': 'condicion',
  'departamento': 'departamento',
  'provincia': 'provincia',
  'distrito': 'distrito',
  'tipo de contribuyente': 'tipo_contribuyente',
  'tipo contribuyente': 'tipo_contribuyente',
};

function parseTableHtml(html: string): RucPeruResponse | null {
  const result: Partial<RucPeruResponse> = {};
  const tableMatch = html.match(/<table[^>]*class="[^"]*ruc-table[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return null;

  const tableContent = tableMatch[1];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
    }

    if (cells.length >= 2) {
      const label = cells[0].toLowerCase().replace(/[:\s]+/g, ' ').trim();
      const value = cells[1].replace(/\s+/g, ' ').trim();
      const fieldKey = FIELD_MAP[label];
      if (fieldKey && value) {
        result[fieldKey] = value;
      }
    }
  }

  if (!result.ruc) return null;
  return result as RucPeruResponse;
}

function parseNonceFromHtml(html: string, type: 'dni' | 'ruc'): string | null {
  const classPattern = type === 'dni'
    ? /class="[^"]*cruc-search-dni[^"]*"[^>]*data-nonce="([^"]+)"/
    : /class="[^"]*cruc-search-ruc[^"]*"[^>]*data-nonce="([^"]+)"/;
  const match = html.match(classPattern);
  if (match) return match[1];
  const fallback = html.match(/data-nonce="([^"]+)"/);
  return fallback ? fallback[1] : null;
}

function parseTokenFromResponse(text: string): { cruc_token: string; cruc_sig: string } | null {
  try {
    const data = JSON.parse(text);
    if (data?.success && data?.data) {
      if (Array.isArray(data.data.tokens) && data.data.tokens.length > 0) {
        const t = data.data.tokens[0];
        if (t.cruc_token && t.cruc_sig) {
          return { cruc_token: t.cruc_token, cruc_sig: t.cruc_sig };
        }
      }
      if (data.data.cruc_token && data.data.cruc_sig) {
        return { cruc_token: data.data.cruc_token, cruc_sig: data.data.cruc_sig };
      }
      if (data.data.token) {
        const token = data.data.token;
        const sig = data.data.sig || data.data.signature || token;
        return { cruc_token: token, cruc_sig: sig };
      }
    }
    const legacyMatch = text.match(/"token"\s*:\s*"([^"]+)"/);
    if (legacyMatch) {
      const sigMatch = text.match(/"sig(?:nature)?"\s*:\s*"([^"]+)"/i);
      return { cruc_token: legacyMatch[1], cruc_sig: sigMatch ? sigMatch[1] : legacyMatch[1] };
    }
  } catch {
    const legacyMatch = text.match(/"token"\s*:\s*"([^"]+)"/);
    if (legacyMatch) {
      return { cruc_token: legacyMatch[1], cruc_sig: legacyMatch[1] };
    }
  }
  return null;
}

async function fetchWithCookies(url: string, options: RequestInit = {}): Promise<{ body: string; cookie: string }> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': USER_AGENT,
      ...(options.headers as Record<string, string> || {}),
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    console.error(`[RucPeru] fetchWithCookies error: HTTP ${response.status} from ${url}`);
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const setCookieRaw = response.headers.get('set-cookie') || '';
  const cookie = setCookieRaw
    .split(/,(?=\s*\w+=)/)
    .map((c) => c.trim().split(';')[0])
    .filter(Boolean)
    .join('; ');

  const body = await response.text();

  return { body, cookie };
}

async function obtenerNonceYCookies(type: 'dni' | 'ruc'): Promise<{ nonce: string; cookie: string }> {
  const url = type === 'dni' ? DNI_PAGE : RUC_PAGE;
  const { body, cookie } = await fetchWithCookies(url);

  const nonce = parseNonceFromHtml(body, type);
  if (!nonce) {
    throw new Error(`No se encontró nonce en ${url}`);
  }

  return { nonce, cookie };
}

async function obtenerTokens(
  nonce: string,
  cookie: string,
  context: string
): Promise<CrucToken> {
  const body = new URLSearchParams();
  body.append('action', 'cruc_get_tokens');
  body.append('context', context);
  body.append('count', '1');
  body.append('company', '');

  const response = await fetch(AJAX_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
      'Referer': context === 'cruc_search_dni' ? DNI_PAGE : RUC_PAGE,
      'Cookie': cookie,
      'Origin': 'https://rucperu.com',
    },
    body: body.toString(),
    signal: AbortSignal.timeout(15000),
  });

  const text = await response.text();
  const parsed = parseTokenFromResponse(text);

  if (parsed) {
    return {
      cruc_token: parsed.cruc_token,
      cruc_sig: parsed.cruc_sig,
      expires_at: Math.floor(Date.now() / 1000) + 60,
    };
  }

  console.error(`[RucPeru] Token response (new format) did not contain tokens. Status: ${response.status}. Body preview: ${text.slice(0, 200)}`);

  const body2 = new URLSearchParams();
  body2.append('action', 'cruc_get_tokens');
  body2.append('nonce', nonce);

  const response2 = await fetch(AJAX_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
      'Referer': context === 'cruc_search_dni' ? DNI_PAGE : RUC_PAGE,
      'Cookie': cookie,
    },
    body: body2.toString(),
    signal: AbortSignal.timeout(15000),
  });

  const text2 = await response2.text();
  const parsed2 = parseTokenFromResponse(text2);

  if (parsed2) {
    return {
      cruc_token: parsed2.cruc_token,
      cruc_sig: parsed2.cruc_sig,
      expires_at: Math.floor(Date.now() / 1000) + 60,
    };
  }

  console.error(`[RucPeru] Token response (legacy format) also failed. Status: ${response2.status}. Body preview: ${text2.slice(0, 200)}`);
  throw new Error('No se pudieron obtener los tokens de rucperu.com');
}

async function buscar(
  params: Record<string, string>,
  token: CrucToken,
  cookie: string
): Promise<RucPeruResponse | null> {
  const body = new URLSearchParams();
  body.append('company', '');
  body.append('cruc_token', token.cruc_token);
  body.append('cruc_sig', token.cruc_sig);

  for (const [key, value] of Object.entries(params)) {
    body.append(key, value);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': USER_AGENT,
    'Referer': 'https://rucperu.com/consulta-ruc/',
    'Origin': 'https://rucperu.com',
  };
  if (cookie) {
    headers['Cookie'] = cookie;
  }

  const response = await fetch(AJAX_URL, {
    method: 'POST',
    headers,
    body: body.toString(),
    signal: AbortSignal.timeout(15000),
  });

  const text = await response.text();

  if (!response.ok) {
    console.error(`[RucPeru] Search request failed: HTTP ${response.status}. Body: ${text.slice(0, 300)}`);
    throw new Error(`Error en búsqueda: HTTP ${response.status}`);
  }

  let json: Record<string, unknown>;

  try {
    json = JSON.parse(text);
  } catch {
    const parsed = parseTableHtml(text);
    if (parsed) return parsed;
    return null;
  }

  if (!json.success) {
    const msg = (json.data as Record<string, unknown>)?.message as string;
    if (msg) {
      throw new Error(msg);
    }
    return null;
  }

  const html = (json.data as Record<string, unknown>)?.html as string;
  if (html) {
    const parsed = parseTableHtml(html);
    if (parsed) return parsed;
  }

  const data = json.data as Record<string, unknown> | undefined;
  if (data) {
    const result: Partial<RucPeruResponse> = {};
    if (data.ruc || data.numero_ruc) result.ruc = String(data.ruc || data.numero_ruc);
    if (data.razon_social || data.nombre) result.razon_social = String(data.razon_social || data.nombre);
    if (data.direccion || data.domicilio) result.direccion = String(data.direccion || data.domicilio);
    if (data.estado) result.estado = String(data.estado);
    if (data.condicion) result.condicion = String(data.condicion);
    if (data.departamento) result.departamento = String(data.departamento);
    if (data.provincia) result.provincia = String(data.provincia);
    if (data.distrito) result.distrito = String(data.distrito);
    if (data.tipo_contribuyente || data.tipo) result.tipo_contribuyente = String(data.tipo_contribuyente || data.tipo);
    if (result.ruc) return result as RucPeruResponse;
  }

  return null;
}

export async function consultarRucPorDni(dni: string): Promise<RucPeruResponse | null> {
  if (!/^\d{8}$/.test(dni)) {
    console.warn('[RucPeru] DNI inválido:', dni);
    return null;
  }

  try {
    const { nonce, cookie } = await obtenerNonceYCookies('dni');
    console.log('[RucPeru] Nonce obtenido para DNI, largo:', nonce.length, '| cookie:', !!cookie);
    const token = await obtenerTokens(nonce, cookie, 'cruc_search_dni');
    console.log('[RucPeru] Tokens obtenidos para DNI');
    return await buscar({ action: 'cruc_search_dni', dni }, token, cookie);
  } catch (error) {
    console.error('[RucPeru] Error en consultarRucPorDni:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function consultarRucEnRucPeru(ruc: string): Promise<RucPeruResponse | null> {
  if (!/^\d{11}$/.test(ruc)) {
    console.warn('[RucPeru] RUC inválido:', ruc);
    return null;
  }

  try {
    const { nonce, cookie } = await obtenerNonceYCookies('ruc');
    console.log('[RucPeru] Nonce obtenido para RUC, largo:', nonce.length, '| cookie:', !!cookie);
    const token = await obtenerTokens(nonce, cookie, 'cruc_search_ruc');
    console.log('[RucPeru] Tokens obtenidos para RUC');
    return await buscar({ action: 'cruc_search_ruc', ruc }, token, cookie);
  } catch (error) {
    console.error('[RucPeru] Error en consultarRucEnRucPeru:', error instanceof Error ? error.message : error);
    return null;
  }
}
