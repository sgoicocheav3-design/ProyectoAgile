import { NextResponse } from 'next/server';

const ROBOFLOW_API_KEY = process.env.NEXT_PUBLIC_ROBOFLOW_API_KEY || 'dL3elWTQDy5dakUOlfr';
const ROBOFLOW_URL = 'https://serverless.roboflow.com/architectural-blueprint/2';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const image = body?.image;

    if (!image) {
      return NextResponse.json({ error: 'No se recibió la imagen.' }, { status: 400 });
    }

    const base64 = typeof image === 'string' && image.includes('base64,')
      ? image.split('base64,')[1]
      : image;

    const roboflowRes = await fetch(`${ROBOFLOW_URL}?api_key=${ROBOFLOW_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: base64,
    });

    if (!roboflowRes.ok) {
      const errorText = await roboflowRes.text();
      console.error('[Roboflow Proxy Error]', roboflowRes.status, errorText);
      return NextResponse.json(
        { error: `Error de Roboflow: ${roboflowRes.status}` },
        { status: 502 }
      );
    }

    const data = await roboflowRes.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[Validate Plan Proxy Error]', err);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
