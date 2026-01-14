import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/health", (_, res) => res.json({ ok: true }));

const schema = {
  name: "alfred_response",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      reply: { type: "string" },
      actions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { type: "string" },
            payload: {
              type: "object",
              additionalProperties: { type: "string" }
            }
          },
          required: ["type", "payload"]
        }
      }
    },
    required: ["reply", "actions"]
  }
};

app.post("/chat", async (req, res) => {
  try {
    const { userMessage, state } = req.body || {};

    const system = `
You are Alfred, a personal assistant.
You MUST return valid JSON matching the schema.
No extra text.

Actions supported:
- logMeal payload: { calories: "number", protein: "number" }
- setNutritionGoal payload: { calories: "number", protein: "number" }
- setBedTime payload: { time: "HH:MM" }
- setLocationContext payload: { value: "home" | "campus" | "work" | "out" }
- setWorkingToday payload: { value: "true" | "false" }
- addTask payload: { category: "string", text: "string" }

Rules:
- If the user says they ate something, estimate calories + protein and include logMeal.
- If user sets goals (calories/protein), include setNutritionGoal.
- If user says bedtime, include setBedTime.
- If user says where they are, include setLocationContext.
- Keep reply short, slightly sarcastic, not mean.
`;

    const response = await client.responses.create({
      model: "gpt-5.1-chat-latest",
      input: [
        { role: "system", content: system },
        {
          role: "user",
          content: `STATE: ${JSON.stringify(state || {})}\nUSER: ${userMessage || ""}`
        }
      ],
      text: { format: { type: "json_schema", json_schema: schema } }
    });

    res.json(JSON.parse(response.output_text));
  } catch (e) {
    console.error(e);
    res.status(500).json({ reply: "Backend error. Try again.", actions: [] });
  }
});

app.listen(process.env.PORT || 3000, () => console.log("Alfred backend running"));
