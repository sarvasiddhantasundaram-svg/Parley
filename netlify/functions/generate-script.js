exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { prompt } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback if no key is configured in Netlify
    if (!apiKey) {
      return {
        statusCode: 200,
        body: JSON.stringify({ source: 'local', text: 'Local fallback active. Key missing.' })
      };
    }

    // Call Google Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are Parley, an AI consumer advocate. Diagnose this issue and provide a phone script, secret legal leverage/policy, and escalation steps: ${prompt}`
          }]
        }]
      })
    });

    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      body: JSON.stringify({ source: 'cloud', text: resultText })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate response.' })
    };
  }
};
