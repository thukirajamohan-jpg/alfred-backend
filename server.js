import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/health", (_, res) => res.json({ ok: true }));

app.post("/chat", async (req, res) => {
  try {
    const { userMessage, state } = req.body || {};

    const prompt = `
You are Alfred, a personal assistant.
Return JSON ONLY in this format:
{
  "reply": "string",
  "actions": [
    { "type": "logMeal", "payload": { "calories": "700", "protein": "35" } }
  ]
}

Rules:
- If user talks about food they ate, estimate calories + protein and include a logMeal action.
- If user sets goals like "set calories to 3000 protein 160", return setNutritionGoal.
- Otherwise, reply normally with actions = [].
STATE: ${JSON.stringify(state || {})}
USER: ${userMessage || ""}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    });

    const text = completion.choices?.[0]?.message?.content || "";
    // If model returns extra text, try to parse the first JSON block:
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const sliced = (jsonStart >= 0 && jsonEnd >= 0) ? text.slice(jsonStart, jsonEnd + 1) : text;

    res.json(JSON.parse(sliced));
  } catch (e) {
    console.error(e);
    res.status(500).json({ reply: "Server error", actions: [] });
  }
});

app.listen(process.env.PORT || 3000, () => console.log("Alfred backend running"));
