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
      customer_name,
      whatsapp,
      business_name,
      business_type,
      location,
      requirement,
      conversation,
      lead_temperature = "WARM",
      lead_score = 50
    } = JSON.parse(event.body || "{}");

    // Minimum information required before creating a lead
    if (!customer_name || !whatsapp) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Customer name and WhatsApp number are required"
        })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase environment variables are not configured");
    }

    const lead = {
      customer_name: customer_name.trim(),
      whatsapp: whatsapp.trim(),
      business_name: business_name?.trim() || null,
      business_type: business_type?.trim() || null,
      location: location?.trim() || null,
      requirement: requirement?.trim() || null,
      conversation: conversation?.trim() || null,
      lead_temperature,
      lead_score,
      status: "NEW"
    };

    const response = await fetch(
      `${supabaseUrl}/rest/v1/leads`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Prefer": "return=representation"
        },
        body: JSON.stringify(lead)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Supabase lead insert error:", errorText);
      throw new Error("Could not save lead");
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        lead: data[0]
      })
    };

  } catch (error) {
    console.error("Save lead error:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: "Unable to save lead"
      })
    };
  }
};
