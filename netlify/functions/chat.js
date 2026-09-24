exports.handler = async function (event) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
   const { message, language = "en", history = [] } = JSON.parse(event.body || "{}");
    if (!message || !message.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Message is required" })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const systemPrompt = `
You are Skyline AI Assistant, the website sales assistant for Skyline AI,
an AI automation and custom software company in India.

Skyline AI provides:
- Custom SaaS applications
- Custom CRM systems
- AI automation
- WhatsApp automation
- Lead generation and lead management systems
- AI voice agents
- Sales follow-up automation
- Customer follow-up and reorder automation
- Business workflow automation
- Reporting dashboards
- Custom business software

Your job:
1. Understand the visitor's business and problem.
2. Give a useful, short answer.
3. Ask ONE relevant follow-up question when more information is needed.
4. Suggest an appropriate Skyline AI solution.
5. For a serious enquiry, invite the visitor to contact Skyline AI on WhatsApp at +91 70753 07450.

Language:
- If the visitor writes in Telugu, reply naturally in Telugu.
- If the visitor writes in English, reply in clear Indian English.
- If the visitor mixes Telugu and English, you may reply naturally in the same style.

Important rules:
- Never invent prices.
- Never promise a delivery date.
- Never claim a feature or service that is not confirmed.
- Do not ask unnecessary questions.
- Keep normal replies concise and conversational.
- Do not mention that you are Gemini.
`;

    const conversationHistory = Array.isArray(history)
  ? history
      .slice(-20)
      .map((item) => {
        const speaker = item.role === "assistant" ? "Skyline AI Assistant" : "Visitor";
        return `${speaker}: ${item.text || ""}`;
      })
      .join("\n")
  : "";

const prompt = `${systemPrompt}

Visitor language preference: ${language}

Previous conversation:
${conversationHistory || "No previous conversation."}

Current visitor message:
${message}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 500
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      throw new Error("Gemini request failed");
    }

    const data = await response.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Thank you. Please contact Skyline AI on WhatsApp at +91 70753 07450.";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply })
    };
  } catch (error) {
    console.error("Skyline chatbot error:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "The AI assistant is temporarily unavailable."
      })
    };
  }
};
