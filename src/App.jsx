import { useState, useEffect, useRef } from "react";
import { URL } from "./constants";
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
      (h) => (h.question || "").trim() !== normalizedKey
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let response = await fetch(URL, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();

      const rawText =
        json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response from API.";

      let dataString = rawText.split("* ").map((s) => s.trim()).filter(Boolean);

      const newResult = [
        ...result,
        { type: "q", text: normalizedKey },
        { type: "a", text: dataString },
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
            const questionContainers = document.querySelectorAll('.flex.justify-end');
            
            // Look for the question that matches the clicked one
            let found = false;
            for (let container of questionContainers) {
              const questionElement = container.querySelector('li');
              if (questionElement && questionElement.textContent.includes(questionText)) {
                // Scroll this question into view at the top
                questionElement.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'start' 
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
    if (window.confirm("Are you sure you want to clear ALL chat history? This cannot be undone.")) {
      localStorage.removeItem("history");
      localStorage.removeItem("allChats");
      setRecentHistory([]);
      setResult([]);
      alert("All history and chats have been cleared!");
    }
  };

  // Function to clear only sidebar history (keeps current chat)
  const clearSidebarHistory = () => {
    if (window.confirm("Clear sidebar history? Current chat will remain visible.")) {
      localStorage.removeItem("history");
      setRecentHistory([]);
      alert("Sidebar history cleared!");
    }
  };

  return (
    <div className="grid grid-cols-5 h-screen overflow-hidden">
      <div className="col-span-1 bg-gray-900 text-center">
        <div className="flex justify-between items-center pt-5 px-4">
          <h1 className="text-xl text-white">Recent History</h1>
          <div className="flex space-x-2">
            <button
              onClick={clearSidebarHistory}
              className="hover:bg-red-600 p-2 rounded transition"
              title="Clear sidebar history"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="20px"
                viewBox="0 -960 960 960"
                width="20px"
                fill="#ffffff"
              >
                <path d="M312-144q-29.7 0-50.85-21.15Q240-186.3 240-216v-480h-48v-72h192v-48h192v48h192v72h-48v479.57Q720-186 698.85-165T648-144H312Zm336-552H312v480h336v-480ZM384-288h72v-336h-72v336Zm120 0h72v-336h-72v336ZM312-696v480-480Z" />
              </svg>
            </button>
          </div>
        </div>

        <ul className="text-left overflow-auto text-sm pt-4">
          {recentHistory &&
            recentHistory.map((item) => (
              <li
                onClick={() => handleHistoryClick(item.id, item.question)}
                className="pl-5 p-3 truncate text-gray-300 cursor-pointer hover:bg-gray-800 hover:text-white border-b border-gray-800 transition-colors duration-200"
                key={item.id}
              >
                {item.question}
              </li>
            ))}
        </ul>
      </div>

      <div className="col-span-4 p-10">
        <div
          ref={chatContainerRef}
          className="w-full container overflow-x-hidden h-150 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-900 [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          <div className="text-white">
            <ul>
              {result.map((item, index) => (
                <div key={index} className={item.type === "q" ? "flex justify-end" : ""}>
                  {item.type === "q" ? (
                    <li className="text-right p-1 mb-4 border-8 bg-blue-950 border-blue-950 rounded-tl-3xl rounded-br-3xl rounded-bl-3xl w-fit">
                      <Answers ans={item.text} totalResult={1} index={index} type={item.type} />
                    </li>
                  ) : (
                    item.text.map((ansItem, ansIndex) => (
                      <li key={index + "-" + ansIndex} className="text-left p-1 mb-3">
                        <Answers ans={ansItem} totalResult={item.text.length} index={ansIndex} type={item.type} />
                      </li>
                    ))
                  )}
                </div>
              ))}
            </ul>
            <div ref={chatEndRef} />
          </div>
        </div>

        <div className="bg-gray-900 w-1/2 p-5 pr-5 text-white border border-blue-700 rounded-lg m-auto flex flex-col gap-3 mt-6">
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
              className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-800 transition ml-2" 
              onClick={askQuestion} 
              disabled={loading}
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