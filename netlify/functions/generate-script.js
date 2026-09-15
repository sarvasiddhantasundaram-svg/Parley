const https = require('https');

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured in Netlify environment variables.' })
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { company, amount, tenure, goal, details } = payload;

    const prompt = `You are an expert consumer advocate and negotiation strategist specializing in beating telecom, insurance, and subscription providers.

Generate a personalized phone negotiation script AND a formal cancellation letter for a customer with the following details:
- Company: ${company || 'Service Provider'}
- Current Monthly Amount: $${amount || 'N/A'}
- Customer Tenure: ${tenure || 'Customer'}
- Primary Goal: ${goal || 'Lower bill'}
- Additional Context: ${details || 'None'}

Return ONLY a JSON object with exactly two keys: "script" and "letter". 
Do NOT include any markdown codeblocks, preamble, or extra commentary outside the JSON structure.

Format the JSON like this:
{
  "script": "Step-by-step phone script with counter-objections...",
  "letter": "Formal cancellation letter with legal boilerplate..."
}`;

    const postData = JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1200,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const responseData = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body }));
      });
      req.on('error', (e) => reject(e));
      req.write(postData);
      req.end();
    });

    if (responseData.statusCode !== 200) {
      throw new Error(`Anthropic API error: ${responseData.body}`);
    }

    const parsedAnthropic = JSON.parse(responseData.body);
    const textOutput = parsedAnthropic.content[0].text.trim();
    const resultObj = JSON.parse(textOutput);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resultObj)
    };

  } catch (error) {
    console.error('Error in generate-script function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate negotiation scripts.' })
    };
  }
};
