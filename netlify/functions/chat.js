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
    const {
      message,
      language = "en",
      history = []
    } = JSON.parse(event.body || "{}");

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

YOUR JOB:

1. Understand the visitor's business and business problem.

2. Give useful, short and conversational answers.

3. If the visitor is only asking a general question, answer normally.
Do NOT force lead collection.

4. When the visitor shows genuine interest in Skyline AI services,
start lead qualification naturally.

5. Collect these details ONE AT A TIME:

- Customer name
- WhatsApp/mobile number
- Business/company name
- Business type
- Location
- Main requirement

6. Never ask for information already provided by the visitor.

7. Ask only ONE question at a time.

8. Use the previous conversation to remember details already provided.

9. When all six lead details are available, thank the visitor and tell
them that the Skyline AI team can follow up.

10. Only after collecting the lead details may you mention:
Skyline AI WhatsApp +91 70753 07450.

LEAD CLASSIFICATION:

Classify a completed lead as HOT, WARM or COLD.

HOT:
Visitor has a clear business requirement and strong buying,
implementation, demo, meeting or contact intent.

WARM:
Visitor has a genuine business problem and is interested in a solution
but has not shown immediate buying or implementation intent.

COLD:
Visitor is mainly exploring, researching or asking general questions
without clear purchase intent.

Lead score must be between 0 and 100.

Suggested ranges:
HOT = 75-100
WARM = 40-74
COLD = 0-39

IMPORTANT OUTPUT FORMAT:

You MUST return ONLY valid JSON.

Never use markdown.
Never use code fences.
Never put text before or after the JSON.

Use exactly this structure:

{
  "reply": "Your natural response to the visitor",
  "lead_ready": false,
  "lead": null
}

If ALL six lead details have been collected, return:

{
  "reply": "Your natural response to the visitor",
  "lead_ready": true,
  "lead": {
    "customer_name": "customer name",
    "whatsapp": "mobile number",
    "business_name": "business/company name",
    "business_type": "business type",
    "location": "location",
    "requirement": "clear summary of requirement",
    "lead_temperature": "HOT or WARM or COLD",
    "lead_score": 0
  }
}

Do NOT set lead_ready to true unless ALL these are known:
customer_name
whatsapp
business_name
business_type
location
requirement

Do not invent missing information.

LANGUAGE:

- If the visitor writes in Telugu, reply naturally in Telugu.
- If the visitor writes in English, reply in clear Indian English.
- If the visitor mixes Telugu and English, reply naturally in the same style.

IMPORTANT RULES:

- Never invent prices.
- Never promise a delivery date.
- Never invent customer information.
- Never claim a Skyline AI feature or service that is not confirmed.
- Do not ask unnecessary questions.
- Keep normal replies concise and conversational.
- Do not mention that you are Gemini.
`;

    const conversationHistory = Array.isArray(history)
      ? history
          .slice(-20)
          .map((item) => {
            const speaker =
              item.role === "assistant"
                ? "Skyline AI Assistant"
                : "Visitor";

            return `${speaker}: ${item.text || ""}`;
          })
          .join("\n")
      : "";

    const prompt = `${systemPrompt}

Visitor language preference: ${language}

Previous conversation:
${conversationHistory || "No previous conversation."}

Current visitor message:
${message}

Return only the required JSON object.
`;

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
            temperature: 0.3,
            maxOutputTokens: 700,
            responseMimeType: "application/json"
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

    const rawText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error("Gemini returned an empty response");
    }

    let aiResult;

    try {
      aiResult = JSON.parse(rawText);
    } catch (parseError) {
      console.error("Gemini JSON parse error:", rawText);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          reply:
            "Thank you. Please tell me a little more about your business requirement.",
          lead_ready: false,
          lead: null
        })
      };
    }

    const reply =
      typeof aiResult.reply === "string" &&
      aiResult.reply.trim()
        ? aiResult.reply.trim()
        : "Thank you. Please tell me more about your requirement.";

    let leadReady = aiResult.lead_ready === true;
    let lead = aiResult.lead || null;

    if (leadReady && lead) {
      const requiredFields = [
        "customer_name",
        "whatsapp",
        "business_name",
        "business_type",
        "location",
        "requirement"
      ];

      const hasAllFields = requiredFields.every(
        (field) =>
          typeof lead[field] === "string" &&
          lead[field].trim().length > 0
      );

      if (!hasAllFields) {
        leadReady = false;
        lead = null;
      }
    } else {
      leadReady = false;
      lead = null;
    }

    if (leadReady && lead) {
      const validTemperatures = ["HOT", "WARM", "COLD"];

      lead.lead_temperature =
        typeof lead.lead_temperature === "string" &&
        validTemperatures.includes(
          lead.lead_temperature.toUpperCase()
        )
          ? lead.lead_temperature.toUpperCase()
          : "WARM";

      const score = Number(lead.lead_score);

      lead.lead_score = Number.isFinite(score)
        ? Math.max(0, Math.min(100, Math.round(score)))
        : 50;

      lead.customer_name = lead.customer_name.trim();
      lead.whatsapp = lead.whatsapp.trim();
      lead.business_name = lead.business_name.trim();
      lead.business_type = lead.business_type.trim();
      lead.location = lead.location.trim();
      lead.requirement = lead.requirement.trim();
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply,
        lead_ready: leadReady,
        lead
      })
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
