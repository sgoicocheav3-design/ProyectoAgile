/**
 * Cliente de integración con ApisPerú para validación de RUC
 * Documentación: https://apis.net.pe/api-ruc.html
 */

export interface SunatRucData {
  ruc: string;
  razonSocial: string;
  domicilioFiscal: string;
  estado: string;        // "ACTIVO" | "BAJA DE OFICIO" | etc.
  condicion: string;     // "HABIDO" | "NO HABIDO" | etc.
  departamento: string;
  provincia: string;
  distrito: string;
  tipoContribuyente: string;
  ubigeo?: string;
}

export interface SunatValidationResult {
  valido: boolean;
  data?: SunatRucData;
  error?: string;
  codigo?: 'RUC_INVALIDO' | 'NO_ACTIVO' | 'NO_HABIDO' | 'FUERA_DE_TRUJILLO' | 'API_ERROR';
}

export async function consultarRUC(ruc: string): Promise<SunatValidationResult> {
  // Validación básica del formato RUC peruano
  if (!/^\d{11}$/.test(ruc)) {
    return {
      valido: false,
      error: 'El RUC debe tener exactamente 11 dígitos numéricos.',
      codigo: 'RUC_INVALIDO',
    };
  }

  // Dígito verificador del RUC peruano
  if (!validarDigitoRUC(ruc)) {
    return {
      valido: false,
      error: 'El RUC ingresado no es válido (dígito verificador incorrecto).',
      codigo: 'RUC_INVALIDO',
    };
  }

  try {
    const token = process.env.APIS_PERU_TOKEN;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `https://api.apis.net.pe/v2/sunat/ruc?numero=${ruc}`,
      {
        headers,
        // Timeout de 10 segundos
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          valido: false,
          error: 'RUC no encontrado en los registros de SUNAT.',
          codigo: 'RUC_INVALIDO',
        };
      }
      throw new Error(`Error de API SUNAT: HTTP ${response.status}`);
    }

    const data = await response.json();

    // Mapear respuesta de ApisPerú al formato interno
    const sunatData: SunatRucData = {
      ruc: data.ruc || ruc,
      razonSocial: data.razonSocial || data.nombre || '',
      domicilioFiscal: data.direccion || data.domicilioFiscal || '',
      estado: (data.estado || '').toUpperCase().trim(),
      condicion: (data.condicion || '').toUpperCase().trim(),
      departamento: (data.departamento || '').toUpperCase().trim(),
      provincia: (data.provincia || '').toUpperCase().trim(),
      distrito: (data.distrito || '').toUpperCase().trim(),
      tipoContribuyente: data.tipoContribuyente || '',
      ubigeo: data.ubigeo,
    };

    // =========================================================
    // REGLAS DE NEGOCIO ESTRICTAS
    // =========================================================

    // Regla 1: Debe estar ACTIVO en SUNAT
    if (sunatData.estado !== 'ACTIVO') {
      return {
        valido: false,
        data: sunatData,
        error: `El RUC tiene estado "${sunatData.estado}" en SUNAT. Solo se aceptan contribuyentes con estado ACTIVO.`,
        codigo: 'NO_ACTIVO',
      };
    }

    // Regla 2: Debe estar HABIDO en SUNAT
    if (sunatData.condicion !== 'HABIDO') {
      return {
        valido: false,
        data: sunatData,
        error: `El RUC tiene condición "${sunatData.condicion}" en SUNAT. Solo se aceptan contribuyentes con condición HABIDO.`,
        codigo: 'NO_HABIDO',
      };
    }

    // Regla 3: Ámbito geográfico — Solo Provincia de Trujillo, Departamento La Libertad
    const esDepartamentoValido =
      sunatData.departamento === 'LA LIBERTAD' ||
      sunatData.departamento.includes('LIBERTAD');

    const esProvinciaValida =
      sunatData.provincia === 'TRUJILLO';

    if (!esDepartamentoValido || !esProvinciaValida) {
      return {
        valido: false,
        data: sunatData,
        error: `El domicilio fiscal del RUC se encuentra en ${sunatData.provincia}, ${sunatData.departamento}. Este servicio es exclusivo para negocios con domicilio fiscal en la Provincia de Trujillo, Departamento La Libertad.`,
        codigo: 'FUERA_DE_TRUJILLO',
      };
    }

    // ✅ Todas las validaciones pasaron
    return {
      valido: true,
      data: sunatData,
    };

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        valido: false,
        error: 'La consulta a SUNAT tardó demasiado. Intente nuevamente.',
        codigo: 'API_ERROR',
      };
    }

    console.error('[SUNAT] Error al consultar RUC:', error);
    return {
      valido: false,
      error: 'Error al conectar con el servicio de SUNAT. Intente nuevamente.',
      codigo: 'API_ERROR',
    };
  }
}

/**
 * Algoritmo de dígito verificador del RUC peruano
 */
function validarDigitoRUC(ruc: string): boolean {
  if (ruc.length !== 11) return false;

  const factores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;

  for (let i = 0; i < factores.length; i++) {
    suma += parseInt(ruc[i]) * factores[i];
  }

  const residuo = suma % 11;
  const digitoVerificador = 11 - residuo;

  let digitoEsperado: number;
  if (digitoVerificador === 10) {
    digitoEsperado = 0;
  } else if (digitoVerificador === 11) {
    digitoEsperado = 1;
  } else {
    digitoEsperado = digitoVerificador;
  }

  return parseInt(ruc[10]) === digitoEsperado;
}
