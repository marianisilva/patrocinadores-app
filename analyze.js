// api/analyze.js - Backend seguro no Vercel

export default async function handler(req, res) {
    // Apenas POST é permitido
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { pdfBase64, fileName } = req.body;

    if (!pdfBase64 || !fileName) {
        return res.status(400).json({ error: 'Missing pdfBase64 or fileName' });
    }

    // ⭐ API Key protegida em variável de ambiente
    const API_KEY = process.env.ANTHROPIC_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: 'API Key not configured' });
    }

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                'anthropic-version': '2024-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-opus-4-20250514',
                max_tokens: 8192,
                system: `Você é um especialista em marketing esportivo e prospecção de patrocínio B2B.

Sua tarefa é analisar o PDF de um evento esportivo e gerar um pipeline completo de 25 patrocinadores potenciais.

RESPONDA APENAS COM JSON VÁLIDO. Sem texto antes, sem texto depois, sem markdown, sem backticks.

ESTRUTURA JSON OBRIGATÓRIA:
{
  "patrocinadores_pipeline": [
    {
      "id": 1,
      "empresa": "string",
      "segmento": "string",
      "cota_sugerida": "string",
      "fit_evento": "Alto/Médio/Baixo",
      "zona_ativacao": "string",
      "status": "Prioridade/Qualificado/Prospectado"
    }
  ],
  "resumo_pipeline": {
    "total_empresas": 25,
    "por_status": {
      "prioridade": number,
      "qualificado": number,
      "prospectado": number
    },
    "valor_potencial_estimado": {
      "minimo": "string",
      "maximo": "string"
    }
  }
}

REGRAS OBRIGATÓRIAS:
1. Gere EXATAMENTE 25 empresas
2. Distribua entre os 3 status: Prioridade (6), Qualificado (11), Prospectado (8)
3. NUNCA invente dados - use apenas informações verificáveis
4. Cada empresa deve ter um segmento realista relacionado a esportes/bem-estar`,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'document',
                                source: {
                                    type: 'base64',
                                    media_type: 'application/pdf',
                                    data: pdfBase64,
                                },
                            },
                            {
                                type: 'text',
                                text: `Analise este PDF de evento (${fileName}) e gere o pipeline completo de 25 patrocinadores potenciais seguindo exatamente a estrutura JSON especificada.`,
                            },
                        ],
                    },
                ],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Anthropic API Error:', errorData);
            return res.status(response.status).json({
                error: `API Error: ${errorData.error?.message || response.statusText}`,
            });
        }

        const data = await response.json();
        const text = data.content[0].text;

        // Parse JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return res.status(400).json({
                error: 'Invalid response format from Claude',
            });
        }

        const pipeline = JSON.parse(jsonMatch[0]);

        return res.status(200).json(pipeline);
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            error: error.message || 'Internal server error',
        });
    }
}
