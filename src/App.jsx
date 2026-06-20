import { useState, useEffect, useRef } from "react";
import { BACKEND_URL } from "./constants";
import Answers from "./components/Answers";

function App() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Multi-turn conversation memory: array of { role: "user"|"model", parts: [{text}] }
  // This is sent to the backend on every request so Gemini has full context.
  const [conversationHistory, setConversationHistory] = useState([]);

  const chatContainerRef = useRef(null);
  const chatEndRef = useRef(null);

  // Load history once on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem("history");
      const parsed = stored ? JSON.parse(stored) : [];
      setRecentHistory(Array.isArray(parsed) ? parsed : []);
    } catch (err) {
      console.error("Error loading history:", err);
      setRecentHistory([]);
    }
  };

  // Auto-scroll chat container to bottom whenever result changes
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    } else if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [result]);

  const isEnter = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      askQuestion();
    }
  };

  // ─── Ask a question ─────────────────────────────────────────────────────────
  // Sends the current question + full conversation history to the Express backend.
  // The backend proxies to Gemini with a structured system prompt and returns a reply.
  const askQuestion = async () => {
    if (!question.trim()) return;

    setError(null);
    setLoading(true);

    const normalizedKey = question.trim();
    const id = Date.now().toString();

    // ── Update sidebar history ──────────────────────────────────────────────
    let savedHistory = [];
    try {
      savedHistory = JSON.parse(localStorage.getItem("history") || "[]");
      if (!Array.isArray(savedHistory)) savedHistory = [];
    } catch (err) {
      console.error("Error parsing saved history:", err);
      savedHistory = [];
    }

    const filteredHistory = savedHistory.filter(
      (h) => (h.question || "").trim() !== normalizedKey,
    );
    const newHistoryItem = { id, question: normalizedKey };
    const updatedHistory = [newHistoryItem, ...filteredHistory];

    try {
      localStorage.setItem("history", JSON.stringify(updatedHistory));
      setRecentHistory(updatedHistory);
    } catch (err) {
      console.error("Failed to save history:", err);
    }

    // ── Call the Express backend (secure REST API) ──────────────────────────
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: normalizedKey,
          conversationHistory,          // full multi-turn history
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.reply ?? "No response received.";

      // ── Update multi-turn conversation memory ─────────────────────────────
      // Append the new user + model turn so the next request includes this context.
      const newUserTurn  = { role: "user",  parts: [{ text: normalizedKey }] };
      const newModelTurn = { role: "model", parts: [{ text: rawText }] };
      setConversationHistory((prev) => [...prev, newUserTurn, newModelTurn]);

      // ── Update displayed chat result ──────────────────────────────────────
      const newResult = [
        ...result,
        { type: "q", text: normalizedKey },
        { type: "a", text: [rawText] },
      ];
      setResult(newResult);

      // Save full chat keyed by id in localStorage
      try {
        const allChats = JSON.parse(localStorage.getItem("allChats") || "{}");
        allChats[id] = newResult;
        localStorage.setItem("allChats", JSON.stringify(allChats));
      } catch (err) {
        console.error("Failed saving allChats:", err);
      }

      setQuestion("");
    } catch (err) {
      console.error("askQuestion error:", err);
      setError(err.message || "Unknown error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  // ─── History click: reload a past chat ─────────────────────────────────────
  const handleHistoryClick = (id, questionText) => {
    try {
      const allChats = JSON.parse(localStorage.getItem("allChats") || "{}");
      const chat = allChats[id];
      if (chat) {
        setResult(chat);

        // Rebuild conversationHistory from the stored chat so multi-turn
        // context is preserved when the user continues a past conversation.
        const rebuilt = [];
        for (let i = 0; i < chat.length - 1; i += 2) {
          const q = chat[i];
          const a = chat[i + 1];
          if (q?.type === "q" && a?.type === "a") {
            rebuilt.push({ role: "user",  parts: [{ text: q.text }] });
            rebuilt.push({ role: "model", parts: [{ text: a.text[0] ?? "" }] });
          }
        }
        setConversationHistory(rebuilt);

        setTimeout(() => {
          if (chatContainerRef.current) {
            const questionContainers = document.querySelectorAll(".flex.justify-end");
            let found = false;
            for (let container of questionContainers) {
              const questionElement = container.querySelector("li");
              if (questionElement && questionElement.textContent.includes(questionText)) {
                questionElement.scrollIntoView({ behavior: "smooth", block: "start" });
                found = true;
                break;
              }
            }
            if (!found) {
              chatContainerRef.current.scrollTop = 0;
            }
          }
        }, 100);
      } else {
        setResult([]);
        setConversationHistory([]);
      }
    } catch (err) {
      console.error("Error reading allChats:", err);
      setResult([]);
      setConversationHistory([]);
    }
  };

  // ─── Clear all history and start fresh ─────────────────────────────────────
  const clearAllHistory = () => {
    if (window.confirm("Are you sure you want to clear ALL chat history? This cannot be undone.")) {
      localStorage.removeItem("history");
      localStorage.removeItem("allChats");
      setRecentHistory([]);
      setResult([]);
      setConversationHistory([]);
      alert("All history and chats have been cleared!");
    }
  };

  return (
    <div className="flex flex-col h-dvh overflow-hidden md:grid md:grid-cols-5">
      <div className="hidden md:block col-span-1 bg-gradient-to-b from-gray-900 to-black text-center relative top-0 left-0 transform-gpu backface-hidden">
        {/* Brand section */}
        <div className="pt-8 pb-6 border-b border-gray-800">
          <div className="px-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              ThinkBot
            </h1>
            <p className="text-gray-400 text-l mt-1">Your AI Assistant</p>
          </div>
        </div>

        {/* Recent History section */}
        <div className="mt-4">
          <div className="flex justify-between items-center px-4 py-3">
            <h2 className="text-md font-semibold text-gray-300">
              Recent History
            </h2>
            <button
              onClick={() => {
                localStorage.removeItem("history");
                setRecentHistory([]);
              }}
              className="hover:bg-red-600 p-2 rounded transition"
              title="Clear history"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="18px"
                viewBox="0 -960 960 960"
                width="18px"
                fill="#ffffff"
              >
                <path d="M312-144q-29.7 0-50.85-21.15Q240-186.3 240-216v-480h-48v-72h192v-48h192v48h192v72h-48v479.57Q720-186 698.85-165T648-144H312Zm336-552H312v480h336v-480ZM384-288h72v-336h-72v336Zm120 0h72v-336h-72v336ZM312-696v480-480Z" />
              </svg>
            </button>
          </div>

          {/* History list - hidden scrollbar */}
          <ul className="text-left overflow-y-auto text-sm pt-2 h-[calc(100vh-220px)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-900 [&::-webkit-scrollbar-thumb]:rounded-full">
            {" "}
            {recentHistory &&
              recentHistory.map((item) => (
                <li
                  onClick={() => handleHistoryClick(item.id, item.question)}
                  className="pl-5 pr-3 py-3 truncate text-gray-300 cursor-pointer hover:bg-gray-800 hover:text-white border-b border-gray-800 transition-colors duration-200"
                  key={item.id}
                >
                  {item.question}
                </li>
              ))}
            {recentHistory.length === 0 && (
              <div className="px-5 py-8 text-center">
                <p className="text-gray-500 text-sm">No recent history</p>
                <p className="text-gray-600 text-xs mt-1">
                  Your questions will appear here
                </p>
              </div>
            )}
          </ul>
        </div>
      </div>

      <div className="w-full md:col-span-4 p-4 md:p-10 overflow-hidden flex flex-col h-full">
        <div
          ref={chatContainerRef}
          className="w-full container overflow-x-hidden flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-900 [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          <div className="text-white">
            <ul>
              {result.map((item, index) => (
                <div
                  key={index}
                  className={item.type === "q" ? "flex justify-end" : ""}
                >
                  {item.type === "q" ? (
                    <li className="text-right p-1 mb-4 border-8 bg-blue-950 border-blue-950 rounded-tl-3xl rounded-br-3xl rounded-bl-3xl w-fit">
                      <Answers
                        ans={item.text}
                        totalResult={1}
                        index={index}
                        type={item.type}
                      />
                    </li>
                  ) : (
                    item.text.map((ansItem, ansIndex) => (
                      <li
                        key={index + "-" + ansIndex}
                        className="text-left p-1 mb-3"
                      >
                        <Answers
                          ans={ansItem}
                          totalResult={item.text.length}
                          index={ansIndex}
                          type={item.type}
                        />
                      </li>
                    ))
                  )}
                </div>
              ))}
            </ul>
            <div ref={chatEndRef} />
          </div>
        </div>

        <div className="bg-gray-900 w-full max-w-3xl mx-auto p-3 text-white border border-blue-900 rounded-lg flex flex-col gap-3 mt-4 mb-2 md:mb-6">
          <div className="flex">
            <input
              className="w-full h-full p-2 outline-none bg-transparent"
              value={question}
              onKeyDown={isEnter}
              onChange={(event) => setQuestion(event.target.value)}
              type="text"
              placeholder="Ask me anything"
              disabled={loading}
            />
            <button
              onClick={askQuestion}
              className="px-4 py-2 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-lg hover:from-blue-900 hover:to-indigo-800 transition ml-2 shadow-lg"
            >
              {loading ? "Loading..." : "Enter"}
            </button>
          </div>
        </div>

        {error && <div className="text-red-400 mt-2 text-center">{error}</div>}
      </div>
    </div>
  );
}

export default App;
