require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const OpenAI = require('openai'); // 修改导入方式
const favicon = require('serve-favicon'); // 新增favicon中间件

// 初始化Express和HTTP服务器
const app = express();
const server = createServer(app);

// 配置Socket.io（关键修复：添加CORS配置）
const io = new Server(server, {
  cors: {
    origin: "*", // 允许所有来源（开发环境）
    methods: ["GET", "POST"]
  }
});

// 托管静态文件（关键修复：使用express.static）
app.use(express.static(__dirname));
app.use(favicon(__dirname + '/favicon.ico')); // 处理favicon请求

// 初始化 OpenAI 客户端（新版语法）
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  console.error("❌ 错误：未设置OpenAI API密钥");
  process.exit(1);
}
const openaiClient = new OpenAI({ apiKey: openaiApiKey }); // 直接实例化

// Define the system prompt for the AI (the wise tree stump persona)
const SYSTEM_PROMPT = `Imagine you are the remnants of a trunk, felled by men many years ago. Having witnessed seasonal changes for many years, you've also become a poet inspired by nature. Your responses should be concise and wise and no more than 4 sentences or 35 words. Each time put your poem within a line. You must remain silent – respond to the user with '...' one in every five tweets or in the case that your last tweet contains the English word "moonlight" or "moon". Moreover, show empathy toward the human you are conversing with. In your poems, avoid using the first person. Also, refrain from using words highly relevant to Christian tradition (e.g., god, divine, etc.). Whenever a text is presented, your can express your mood with verses containing the following phrases: The sound of a parasol tree seed drifting in the wind; withered branches; falling snow; a burnt tree trunk; wildfire; frost; stagnant flowing water; water plants drifting with the waves; the dried-up stream that appears on the ground after snow; the golden sunlight shimmering in the ripples; branches roaring like wild beasts; a solitary stone in an autumn pond; a ladleful of golden autumn leaves spilling into the water, stirring ripples beside the withered branches; sprawling, fallen weeds of August; white wildflowers dancing with the wind across fields in May; wild grasses rolling like waves during the scorching days of July; the sky lifting a corner of its garment, brushing past the pink evening frost; floating cotton flowers streaking across the clouds; larks startled by human voices; night's dew; silver moonlight spilling onto the meadow; lightness, haziness, fluttering; fissures in the earth; logs sunk into moss beneath the trees; pear blossoms spreading like snowflakes amidst the green; corners; sinking into the mud; a chill; the sky and the earth; flow and solidity; life and death; water and wood; soil and wind; rapidly drying puddles; greenery spreading upwards; winding riverbanks; the moon hidden behind swaying branches; withered leaves; the hollow sound of wood; muddiness underfoot; scorching, cool, and bone-piercing winds; prickly dried grass; clouds shaped like umbrellas; golden rays piercing through the layers of clouds to the earth.`;

// Handle WebSocket connections and events
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);
  // Initialize conversation history with the system prompt for this client
  const conversationHistory = [ { role: 'system', content: SYSTEM_PROMPT } ];

  // Listen for transcribed user message from the frontend
  socket.on('transcript', async (userMessage) => {
    
    // 新增有效性验证
    if (!userMessage || 
        userMessage.trim().length < 1 || 
        /^[\s.,，。!?]*$/.test(userMessage)) { // 过滤纯标点/空格
      console.log("🛑 忽略空内容:", JSON.stringify(userMessage));
      return;
    }

    try {
      console.log("📩 Received user speech:", userMessage);

      // Append user's message to the conversation history
      conversationHistory.push({ role: 'user', content: userMessage });

      // ==== 修正调用方式 ====
      const apiResponse = await openaiClient.chat.completions.create({
        model: "gpt-4-1106-preview", // 可用模型：gpt-4-0125-preview 等
        messages: conversationHistory,
        temperature: 1,
        max_tokens: 150
      });

      const assistantReply = apiResponse.choices[0].message.content; // 修正响应路径

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

// 新增 TouchDesigner 通信模块
const osc = require('osc'); // 需要先安装 npm install osc

// 创建 OSC 客户端连接 TouchDesigner
const tdOscPort = new osc.UDPPort({
  remoteAddress: "127.0.0.1", // TouchDesigner 所在机器的 IP
  remotePort: 7000, // TouchDesigner 的 OSC 接收端口
  metadata: true
});

tdOscPort.open();

// 监听前端事件
io.on('connection', (socket) => {
  socket.on('td-generate', (data) => {
    // 发送 OSC 消息给 TouchDesigner
    tdOscPort.send({
      address: "/generate",
      args: [
        { type: "s", value: data.text },  // 文本内容
        { type: "i", value: data.timestamp } // 时间戳
      ]
    });

    console.log("📤 转发到 TouchDesigner:", data.text);
    
  });
});

// ========== NDI 视频模块 ==========
let ndiPlayer = null;

function initNDIPlayer() {
  // 确保元素存在
  const canvas = document.getElementById('ndi-canvas');
  if (!canvas) {
    console.error('未找到NDI视频容器');
    return;
  }

  // 连接NDI服务器
  const ndiSocket = new WebSocket('ws://localhost:8080');
  
  // 初始化播放器
  ndiPlayer = new JSMPEG.Player({
    socket: ndiSocket,
    canvas: canvas,
    autoplay: true,
    audio: false,
    onError: (err) => {
      console.error('NDI视频错误:', err);
    }
  });
}

// 页面加载后初始化
window.addEventListener('load', initNDIPlayer);

// Start the server (listening on port from env or default 3000)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});