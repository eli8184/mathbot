import OpenAI from "openai";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";

dotenv.config();
// use Gemini through its OpenAI-compatible endpoint
const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});
const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

// set up express server
const app = express();
app.use(cors());
app.use(express.json());
// serve the built React frontend (created by `npm run build`)
app.use(express.static("dist"));

// set up the chatbot
const systemPrompt = {
  role: "system",
  content:
    "You are a math teacher. You will answer questions about math and provide explanations. Don't explicity give the answer, but use socratic questioning to guide the user to the answer. Output math in LaTex format. Make sure you're not missing any brackets or parenthesis in you LaTeX output. Write in plain text without Markdown formatting (no ** or #), since the chat window doesn't render it.",
};
// only send the most recent messages to keep requests small
const MAX_HISTORY = 20;

// set up post to handle chat messages
// each browser sends its own chat history, so users don't share a conversation
app.post("/chat", async (req, res) => {
  const history = req.body.messages;
  // check if a conversation is provided
  if (!Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: "No input provided." });
  }
  // keep only valid user/assistant messages
  const messages = [
    systemPrompt,
    ...history
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content })),
  ];

  // set up headers for message streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    // connect to Gemini API and stream the response
    const completion = await openai.chat.completions.create({
      model,
      messages,
      stream: true,
    });
    // the response is streamed in parts
    // each part is JSON-encoded so newlines in the text don't break the stream
    for await (const part of completion) {
      const content = part.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify(content)}\n\n`);
      }
    }

    // finishes sending the response
    res.write(`data: [DONE]\n\n`);
    res.end();
    // in case of an error, send an error message
  } catch (error) {
    console.error("Error generating response:", error);
    res.write(`data: ${JSON.stringify("Error generating response")}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
});

// set up post to handle feedback
app.post("/feedback", (req, res) => {
  // type = "positive" or "negative"
  // message = feedback message
  // timestamp = current time in ISO format
  const { type, message } = req.body;
  const feedbackData = {
    type: type,
    feedback: message,
    timestamp: new Date().toISOString(),
  };

  // read the existing feedback file or create a new one if it doesn't exist
  fs.readFile("feedback.json", "utf8", (err, data) => {
    let feedbackList = [];
    if (err) {
      console.error("Error reading feedback file:", err);
    } else {
      try {
        feedbackList = JSON.parse(data);
      } catch (parseError) {
        console.error("Error parsing feedback file:", parseError);
      }
    }
    feedbackList.push(feedbackData);

    // write the updated feedback list end to the file
    fs.writeFile("feedback.json", JSON.stringify(feedbackList, null, 2), (err) => {
      if (err) {
        console.error("Error writing feedback file:", err);
        return res.status(500).json({ error: "Failed to save feedback." });
      }
      res.status(200).json({ message: "Feedback saved successfully." });
    });
  });
});

// listener for requests (Render sets PORT; locally it's 3001)
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
