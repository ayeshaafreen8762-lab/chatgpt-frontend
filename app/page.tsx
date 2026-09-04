"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Plus, MessageSquare, Upload, Mic, MicOff, Send, User, LogOut, Sparkles, Image as ImageIcon, Lock
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Web Speech Recognition for Microphone Input
  const toggleSpeechRecognition = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.start();
  };

  const handleAuth = async (isSignup: boolean) => {
    if (!authEmail || !authPassword) return;
    try {
      const endpoint = isSignup ? "/auth/signup" : "/auth/login";
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      const data = await res.json();
      if (data.token) {
        setUser({ email: authEmail });
        setShowAuthModal(false);
      }
    } catch (err) {
      alert("Authentication failed.");
    }
  };

  const handleSend = async (promptText?: string) => {
    const textToSend = promptText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsgId = Date.now().toString();
    const newMessages: Message[] = [...messages, { id: userMsgId, sender: "user", text: textToSend }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    const aiMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: aiMsgId, sender: "ai", text: "" }]);

    try {
      const response = await fetch("http://localhost:8000/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });

      if (!response.body) throw new Error("No body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.replace("data: ", ""));
              if (data.token) {
                accumulatedText += data.token;
                setMessages((prev) =>
                  prev.map((msg) => (msg.id === aiMsgId ? { ...msg, text: accumulatedText } : msg))
                );
              }
            } catch (e) { }
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === aiMsgId ? { ...msg, text: "Error connecting to backend server." } : msg))
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/upload", { method: "POST", body: formData });
      const data = await res.json();
      alert(`Uploaded & Indexed: ${data.filename}`);
    } catch (err) {
      alert("Upload failed.");
    }
  };

  return (
    <div className="flex h-screen bg-[#0f171e] text-slate-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 border-r border-slate-800 bg-[#131d27] flex flex-col justify-between p-4">
        <div>
          <div className="flex items-center space-x-3 mb-6 px-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-black">O</div>
            <div>
              <h1 className="font-bold text-sm tracking-wide">OmniAI Platform</h1>
              <span className="text-xs text-emerald-400">Groq Llama 3.3 70B</span>
            </div>
          </div>

          <button onClick={() => setMessages([])} className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-xl font-medium transition mb-6">
            <Plus className="w-4 h-4" />
            <span>New Doubt Session</span>
          </button>
        </div>

        {/* User / Auth Footer */}
        <div className="border-t border-slate-800 pt-4 flex items-center justify-between px-2">
          {user ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center"><User className="w-4 h-4" /></div>
                <span className="text-xs truncate max-w-[120px]">{user.email}</span>
              </div>
              <button onClick={() => setUser(null)} className="text-slate-400 hover:text-white"><LogOut className="w-4 h-4" /></button>
            </div>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>Login / Sign Up</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col h-full bg-[#0b1117] relative">
        <header className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-[#111923]">
          <span className="text-sm font-semibold">OmniAI Doubt Solver</span>
          <span className="text-xs text-emerald-400 flex items-center gap-1"><Sparkles className="w-3 h-3" /> System Ready</span>
        </header>

        {/* Chat Stream View */}
        <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col space-y-4">
          {messages.length === 0 ? (
            <div className="my-auto text-center text-slate-400 space-y-3">
              <h2 className="text-2xl font-bold text-white">How can OmniAI assist you today?</h2>
              <p className="text-xs">Type a question, speak into the mic, or use <code className="text-emerald-400">/image prompt</code> to generate visuals.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.sender === "user" ? "bg-emerald-600 text-white rounded-br-none" : "bg-[#16222f] text-slate-200 border border-slate-800 rounded-bl-none"}`}>
                  {msg.text.includes("![Generated Diagram/Image]") ? (
                    <div>
                      <p className="mb-2 text-xs text-emerald-400 font-semibold">Generated Output Visual:</p>
                      <img src={msg.text.match(/\((.*?)\)/)?.[1]} alt="Generated Visual" className="rounded-xl border border-slate-700 max-w-md w-full" />
                    </div>
                  ) : (
                    msg.text || (isLoading ? "Processing..." : "")
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="max-w-3xl mx-auto w-full px-6 pb-6">
          <div className="flex items-center space-x-2 mb-3">
            <label className="flex items-center space-x-1.5 text-xs bg-[#141f2b] border border-slate-800 hover:border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Attach File / Image</span>
              <input type="file" onChange={handleFileUpload} className="hidden" />
            </label>
            <button onClick={() => setInput("/image a futuristic AI neural network diagram")} className="flex items-center space-x-1.5 text-xs bg-[#141f2b] border border-slate-800 hover:border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg">
              <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Generate Image Prompt</span>
            </button>
          </div>

          <div className="relative bg-[#141f2b] border border-slate-800 rounded-2xl p-2 flex items-center space-x-2">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask a doubt or type '/image prompt'..."
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 resize-none outline-none px-3"
            />
            <button onClick={toggleSpeechRecognition} className={`p-2.5 rounded-xl transition ${isListening ? "bg-red-600 text-white animate-pulse" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black p-2.5 rounded-xl transition">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#131d27] border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold text-white">Sign In to OmniAI</h3>
            <input type="email" placeholder="Email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full bg-[#0b1117] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />
            <input type="password" placeholder="Password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full bg-[#0b1117] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />
            <div className="flex space-x-2">
              <button onClick={() => handleAuth(false)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-sm font-medium">Login</button>
              <button onClick={() => handleAuth(true)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-xl text-sm font-medium">Sign Up</button>
            </div>
            <button onClick={() => setShowAuthModal(false)} className="w-full text-xs text-slate-400 mt-2">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}