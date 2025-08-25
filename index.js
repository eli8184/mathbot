import OpenAI from "openai";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";

dotenv.config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// set up express server
const app = express();
app.use(cors());
app.use(express.json());

// set up the chatbot
const messages = [
  {
    role: "system",
    content:
      "You are a math teacher. You will answer questions about math and provide explanations. Don't explicity give the answer, but use socratic questioning to guide the user to the answer. Output math in LaTex format. Make sure you're not missing any brackets or parenthesis in you LaTeX output.",
  },
];

// set up post to handle chat messages
app.post("/chat", async (req, res) => {
  const userInput = req.body.message;
  // check if userInput is provided
  if (!userInput) {
    return res.status(400).json({ error: "No input provided." });
  }
  // add user input to messages
  messages.push({ role: "user", content: userInput });

  // set up headers for message streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    // connect to OpenAI API and stream the response
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      stream: true,
    });
    // process the streamed response
    let assistantResponse = "";
    // the response is streamed in parts
    // we will concatenate the parts to form the complete response
    for await (const part of completion) {
      const content = part.choices[0]?.delta?.content;
      if (content) {
        assistantResponse += content;
        res.write(`data: ${content}\n\n`);
      }
    }

    messages.push({ role: "assistant", content: assistantResponse });
    // finishes sending the response
    res.write(`data: [DONE]\n\n`);
    res.end();
    // in case of an error, send an error message
  } catch (error) {
    console.error("Error generating response:", error);
    res.write(`data: Error generating response\n\n`);
    res.end();
  }
});

// set up post to handle feedback
app.post("/feedback", (req, res) => {
  // type = "positive" or "negative"
  // msg = feedback message
  // timestamp = current time in ISO format
  const { type, msg } = req.body;
  const feedbackData = {
    type: type,
    feedback: msg,
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

// Helper to reset messages to just the system prompt
function resetMessages() {
  messages.length = 0;
  messages.push({
    role: "system",
    content:
      "You are a math teacher. You will answer questions about math and provide explanations. Don't explicity give the answer, but use socratic questioning to guide the user to the answer. Output math in LaTex format. Make sure you're not missing any brackets or parenthesis in you LaTeX output.",
  });
}
// Endpoint to clear chat history on the server
app.post("/clear-history", (req, res) => {
  resetMessages();
  res.status(200).json({ message: "History cleared." });
});

// listener for requests on port 3001
app.listen(3001, () => {
  console.log("Server running at http://localhost:3001");
});