"use client";
import { useState } from "react";

export default function ChatPage() {
  const [inputMessage, setInputMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState("llama-3.1-8b-instant");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg = inputMessage;
    setInputMessage("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("https://chatgpt-ai-platform-production.up.railway.app/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, model: selectedModel }),
      });

      if (!res.ok) throw new Error("Failed to fetch response");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;
        aiResponse += decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { role: "assistant", content: aiResponse };
          return newMsgs;
        });
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Error: Failed to connect to backend or invalid API key." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar with Model Switcher */}
      <div className="w-64 bg-gray-800 p-4 flex flex-col justify-between border-r border-gray-700">
        <div>
          <h1 className="text-xl font-bold text-green-400 mb-6">OmniAI Platform</h1>

          <label className="text-sm text-gray-400 block mb-2 font-medium">Select AI Model:</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700 mb-4 focus:outline-none focus:border-green-500"
          >
            <option value="llama-3.1-8b-instant">Llama 3.1 8B (Lightning Fast)</option>
            <option value="llama-3.3-70b-versatile">Llama 3.3 70B (High Intelligence)</option>
          </select>
        </div>
      </div>

      {/* Chat Main Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`p-3 rounded-lg max-w-xl ${msg.role === 'user' ? 'bg-green-600 ml-auto' : 'bg-gray-800'}`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
          {loading && <div className="text-gray-400 italic">Processing response...</div>}
        </div>

        <form onSubmit={handleSendMessage} className="p-4 bg-gray-800 border-t border-gray-700 flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask a doubt or type your prompt..."
            className="flex-1 bg-gray-900 border border-gray-700 p-3 rounded text-white focus:outline-none focus:border-green-500"
          />
          <button type="submit" className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded font-bold text-gray-950 transition">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}