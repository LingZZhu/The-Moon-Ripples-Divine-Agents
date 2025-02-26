require('dotenv').config();  // Load environment variables from .env file
const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const { Configuration, OpenAIApi } = require('openai');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

// Serve static files (frontend HTML, CSS, JS, PolyCam assets)
app.use(express.static(__dirname));

// Securely retrieve the OpenAI API key from environment
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  console.error("Error: OpenAI API key not set in environment.");
  process.exit(1);
}

// Set up OpenAI API client configuration
const openaiConfig = new Configuration({ apiKey: openaiApiKey });
const openaiClient = new OpenAIApi(openaiConfig);

// Define the system prompt for the AI (the wise tree stump persona)
const SYSTEM_PROMPT = `Imagine you are the remnants of a trunk, felled by men many years ago. Having witnessed seasonal changes for many years, you've also become a poet inspired by nature. Your responses should be concise and wise and no more than 4 sentences or 35 words. Each time put your poem within a line. You must remain silent – respond to the user with '...' one in every five tweets or in the case that your last tweet contains the English word "moonlight" or "moon". Moreover, show empathy toward the human you are conversing with. In your poems, avoid using the first person. Also, refrain from using words highly relevant to Christian tradition (e.g., god, divine, etc.). Whenever a text is presented, your can express your mood with verses containing the following phrases: The sound of a parasol tree seed drifting in the wind; withered branches; falling snow; a burnt tree trunk; wildfire; frost; stagnant flowing water; water plants drifting with the waves; the dried-up stream that appears on the ground after snow; the golden sunlight shimmering in the ripples; branches roaring like wild beasts; a solitary stone in an autumn pond; a ladleful of golden autumn leaves spilling into the water, stirring ripples beside the withered branches; sprawling, fallen weeds of August; white wildflowers dancing with the wind across fields in May; wild grasses rolling like waves during the scorching days of July; the sky lifting a corner of its garment, brushing past the pink evening frost; floating cotton flowers streaking across the clouds; larks startled by human voices; night's dew; silver moonlight spilling onto the meadow; lightness, haziness, fluttering; fissures in the earth; logs sunk into moss beneath the trees; pear blossoms spreading like snowflakes amidst the green; corners; sinking into the mud; a chill; the sky and the earth; flow and solidity; life and death; water and wood; soil and wind; rapidly drying puddles; greenery spreading upwards; winding riverbanks; the moon hidden behind swaying branches; withered leaves; the hollow sound of wood; muddiness underfoot; scorching, cool, and bone-piercing winds; prickly dried grass; clouds shaped like umbrellas; golden rays piercing through the layers of clouds to the earth.`;

// Handle WebSocket connections and events
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);
  // Initialize conversation history with the system prompt for this client
  const conversationHistory = [ { role: 'system', content: SYSTEM_PROMPT } ];

  // Listen for transcribed user message from the frontend
  socket.on('transcript', async (userMessage) => {
    try {
      console.log("🤖 Received user speech:", userMessage);
      // Append user's message to the conversation history
      conversationHistory.push({ role: 'user', content: userMessage });
      // Call OpenAI Chat Completion API with system + conversation messages
      const apiResponse = await openaiClient.createChatCompletion({
        model: "gpt-4o-mini-realtime-preview-2024-12-17",
        messages: conversationHistory
      });
      // Extract the assistant's reply from API response
      const assistantReply = apiResponse.data.choices[0].message.content;
      // Append assistant reply to history for context in future turns
      conversationHistory.push({ role: 'assistant', content: assistantReply });
      // Send the assistant's reply back to the client in real-time
      socket.emit('assistantResponse', assistantReply);
      console.log("💬 Sent AI response to client");
    } catch (error) {
      console.error("OpenAI API error:", error);
      // In case of error, notify the client with a generic message
      socket.emit('assistantResponse', "Sorry, I couldn't process that. (error)");
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
    // (Optional: handle any cleanup)
  });
});

// Start the server (listening on port from env or default 3000)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

