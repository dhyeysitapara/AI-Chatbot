import { useState, useEffect, useRef } from "react";
import { API_URLS } from "./constants";
import Answers from "./components/Answers";

function App() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const chatContainerRef = useRef(null);
  const chatEndRef = useRef(null);

  // Load history once (ensure it's an array)
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

  // Scroll chat container to bottom whenever result changes
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

  const payload = {
    contents: [
      {
        parts: [
          {
            text: question,
          },
        ],
      },
    ],
  };

  const isEnter = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      askQuestion();
    }
  };

  const askQuestion = async () => {
    if (!question.trim()) return;

    setError(null);
    setLoading(true);

    const normalizedKey = question.trim();
    const id = Date.now().toString(); // ALWAYS generate new ID for each question

    // load existing history array safely
    let savedHistory = [];
    try {
      savedHistory = JSON.parse(localStorage.getItem("history") || "[]");
      if (!Array.isArray(savedHistory)) savedHistory = [];
    } catch (err) {
      console.error("Error parsing saved history:", err);
      savedHistory = [];
    }

    // FIX: Remove any existing question with same text (to avoid duplicate IDs)
    const filteredHistory = savedHistory.filter(
      (h) => (h.question || "").trim() !== normalizedKey,
    );

    // Add new item at top with NEW ID
    const newHistoryItem = { id, question: normalizedKey };
    const updatedHistory = [newHistoryItem, ...filteredHistory];

    try {
      localStorage.setItem("history", JSON.stringify(updatedHistory));
      setRecentHistory(updatedHistory);
    } catch (err) {
      console.error("Failed to save history:", err);
    }

    try {
      let success = false;
      let finalJson = null;

      // Try each API URL in order
      for (const url of API_URLS) {
        try {
          console.log("Trying API URL:", url); // Debugging log

          // Skip placeholders
          if (
            url.includes("YOUR_SECOND_API_KEY_HERE") ||
            url.includes("YOUR_THIRD_API_KEY_HERE")
          ) {
            console.log("Skipping placeholder key");
            continue;
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          let response = await fetch(url, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            // If 429 (Too Many Requests) or similar, we might want to try next key.
            // For now, we try next key on ANY error.
            console.warn(
              `API key failed: ${response.status} ${response.statusText}`,
            );
            continue;
          }

          finalJson = await response.json();
          success = true;
          break; // Exit loop on success
        } catch (innerErr) {
          console.warn("Fetch error for key:", innerErr);
          if (innerErr.name === "AbortError") {
            // Determine if we should retry on timeout vs just fail.
            // Usually timeout means backend is slow, not necessarily key limit.
            // But let's try next key anyway just in case.
            continue;
          }
          continue;
        }
      }

      if (!success || !finalJson) {
        throw new Error("All API keys failed or were exhausted.");
      }

      const json = finalJson;

      const rawText =
        json?.candidates?.[0]?.content?.parts?.[0]?.text ??
        "No response from API.";

      console.log("Raw API response:", rawText); // ADD THIS
      // Split by bullet points but keep the formatting
      let dataString = rawText;

      // If no bullets found, just split by paragraphs
      if (dataString.length === 1) {
        dataString = rawText
          .split("\n\n")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      const newResult = [
        ...result,
        { type: "q", text: normalizedKey },
        { type: "a", text: [dataString] },
      ];

      setResult(newResult);

      // Save full chat keyed by id
      try {
        const allChats = JSON.parse(localStorage.getItem("allChats") || "{}");
        allChats[id] = newResult;
        localStorage.setItem("allChats", JSON.stringify(allChats));
        console.log("Saved chat with ID:", id, "Question:", normalizedKey);
      } catch (err) {
        console.error("Failed saving allChats:", err);
      }

      setQuestion("");
    } catch (err) {
      console.error("askQuestion error:", err);
      if (err.name === "AbortError") {
        setError("Request timed out.");
      } else {
        setError(err.message || "Unknown error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryClick = (id, questionText) => {
    try {
      const allChats = JSON.parse(localStorage.getItem("allChats") || "{}");
      const chat = allChats[id];
      if (chat) {
        setResult(chat);

        // Wait for render, then find and scroll to the specific question
        setTimeout(() => {
          if (chatContainerRef.current) {
            // Find all question containers
            const questionContainers =
              document.querySelectorAll(".flex.justify-end");

            // Look for the question that matches the clicked one
            let found = false;
            for (let container of questionContainers) {
              const questionElement = container.querySelector("li");
              if (
                questionElement &&
                questionElement.textContent.includes(questionText)
              ) {
                // Scroll this question into view at the top
                questionElement.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
                found = true;
                break;
              }
            }

            // If we didn't find the specific question, scroll to top
            if (!found) {
              chatContainerRef.current.scrollTop = 0;
            }
          }
        }, 100);
      } else {
        setResult([]);
      }
    } catch (err) {
      console.error("Error reading allChats:", err);
      setResult([]);
    }
  };

  // Function to clear ALL history and chats
  const clearAllHistory = () => {
    if (
      window.confirm(
        "Are you sure you want to clear ALL chat history? This cannot be undone.",
      )
    ) {
      localStorage.removeItem("history");
      localStorage.removeItem("allChats");
      setRecentHistory([]);
      setResult([]);
      alert("All history and chats have been cleared!");
    }
  };

  // Function to clear only sidebar history (keeps current chat)
  const clearSidebarHistory = () => {
    if (
      window.confirm("Clear sidebar history? Current chat will remain visible.")
    ) {
      localStorage.removeItem("history");
      setRecentHistory([]);
      alert("Sidebar history cleared!");
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden md:grid md:grid-cols-5">
      <div className="hidden md:block col-span-1 bg-gradient-to-b from-gray-900 to-black text-center relative top-0 left-0 transform-gpu backface-hidden">
        {/* Brand section - enlarged text, no robot */}
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
          className="w-full container overflow-x-hidden h-150 overflow-y-scroll [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-900 [&::-webkit-scrollbar-thumb]:rounded-full"
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

        <div className="bg-gray-900 w-11/12 md:w-1/2 p-5 pr-5 text-white border border-blue-900 rounded-lg m-auto flex flex-col gap-3 mt-6">
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
            <button className="px-4 py-2 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-lg hover:from-blue-900 hover:to-indigo-800 transition ml-2 shadow-lg">
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
