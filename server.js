import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/health", (_, res) => res.json({ ok: true }));

app.post("/chat", async (req, res) => {
  const { userMessage, state } = req.body || {};

  try {
    const system = `
You are Alfred, a personal assistant.
Reply with JSON ONLY in this exact format:
{
  "reply": "string",
  "actions": [
    { "type": "logMeal", "payload": { "calories": "700", "protein": "35" } }
  ]
}

Actions allowed:
- logMeal payload: { calories: "number", protein: "number" }
- setNutritionGoal payload: { calories: "number", protein: "number" }
- addTask payload: { category: "string", text: "string" }

Rules:
- If user says they ate food, estimate calories + protein and include logMeal.
- If user sets calorie/protein goals, include setNutritionGoal.
- If user asks to add a task, include addTask.

Location rules:
- If location is "campus", prioritize school tasks.
- If location is "work", prioritize job tasks.
- If location is "home", prioritize personal and health tasks.
- If location is "out", keep suggestions minimal.

- Otherwise actions = [].
- Otherwise actions = [].
STATE: ${JSON.stringify(state || {})}
USER: ${userMessage || ""}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: system }],
      temperature: 0.4
    });

    const text = completion.choices?.[0]?.message?.content ?? "";

    // Parse first JSON object in the response
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const candidate = start >= 0 && end >= 0 ? text.slice(start, end + 1) : text;

    let out;
    try {
      out = JSON.parse(candidate);
    } catch {
      out = { reply: "I got a weird response. Try again.", actions: [] };
    }

    // Always return the shape your iOS app expects
    res.status(200).json({
      reply: String(out.reply ?? "Okay."),
      actions: Array.isArray(out.actions) ? out.actions : []
    });
  } catch (e) {
    console.error(e);
    // IMPORTANT: still return 200 so the iOS app doesn't show "can't reach server"
    res.status(200).json({ reply: "Backend hiccup. Try again.", actions: [] });
  }
});

app.listen(process.env.PORT || 3000, () => console.log("Alfred backend running"));
