import { NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are an AI that validates if an image is a proper architectural floor plan (blueprint/plano arquitectónico) for a business/local commercial.

Return ONLY valid JSON with this structure:
{
  "isPlan": boolean,
  "confidence": number (0-100),
  "reason": string (brief explanation in Spanish)
}

Rules:
- isPlan=true only if the image shows a technical/architectural floor plan (with walls, doors, measurements, labels, scale)
- isPlan=false if it's a photo of a building, selfie, document text, receipt, logo, random image, or anything that is NOT a technical plan
- confidence: how sure you are (0=not sure at all, 100=completely sure)
- reason: short explanation in Spanish justifying the decision
- DO NOT include markdown formatting, code blocks, or any text outside the JSON`;

interface RequestBody {
  image: string;
  mimeType: string;
}

export async function POST(request: Request) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'La clave de OpenAI no está configurada.' },
        { status: 500 }
      );
    }

    const body: RequestBody = await request.json();

    if (!body.image) {
      return NextResponse.json(
        { error: 'No se recibió la imagen.' },
        { status: 400 }
      );
    }

    const mimeType = body.mimeType || 'image/png';
    const imageUrl = `data:${mimeType};base64,${body.image}`;

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: '¿Esta imagen es un plano arquitectónico de un local comercial?' },
              { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0.1,
      }),
    });

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      console.error('[OpenAI Error]', openaiRes.status, errorText);
      return NextResponse.json(
        { error: `Error de OpenAI: ${openaiRes.status}` },
        { status: 502 }
      );
    }

    const data = await openaiRes.json();
    const content = data.choices?.[0]?.message?.content || '';

    let parsed: { isPlan: boolean; confidence: number; reason: string };

    try {
      const cleaned = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('[Parse Error] OpenAI response:', content);
      return NextResponse.json(
        { error: 'No se pudo interpretar la respuesta de la IA.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      isPlan: parsed.isPlan,
      confidence: parsed.confidence,
      reason: parsed.reason || '',
    });
  } catch (err) {
    console.error('[Validar Plano Error]', err);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
