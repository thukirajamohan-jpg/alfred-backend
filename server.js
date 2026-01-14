import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));

app.post("/chat", async (req, res) => {
  res.json({
    reply: "Alfred online. Backend connected.",
    actions: []
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Alfred backend running");
});
