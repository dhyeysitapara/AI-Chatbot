import { useState } from "react";
import { URL } from "./constants";
import Answers from "./components/Answers";

function App() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState([]);
  const [recentHistory,setRecentHistory] = useState([])

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

  
const askQuestion = async () => {
  // Get existing history or initialize empty array
  let history = [];
  const storedHistory = localStorage.getItem("history");
  
  if (storedHistory) {
    try {
      history = JSON.parse(storedHistory);
    } catch (error) {
      console.error("Error parsing history:", error);
      history = [];
    }
  }
  
  // Add new question to history
  history = [question, ...history];
  localStorage.setItem("history", JSON.stringify(history));
  setRecentHistory(history);

  let response = await fetch(URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  response = await response.json();

  let dataString = response.candidates[0].content.parts[0].text;

  dataString = dataString.split("* ");
  dataString = dataString.map((item) => item.trim());

  setResult([
    ...result,
    { type: "q", text: question },
    { type: "a", text: dataString },
  ]);
};
  console.log(result);

  return (
    <div className="grid grid-cols-5 h-screen overflow-hidden">
      <div className="col-span-1 bg-gray-900 text-center">
      <div className="flex justify-between items-center pt-5 px-4">
  <h1 className="text-xl text-white">Recent History</h1>
  <button 
    onClick={() => {
      localStorage.removeItem("history");
      setRecentHistory([]);
    }}
    className="hover:bg-red-600 p-2 rounded transition"
  >
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      height="20px" 
      viewBox="0 -960 960 960" 
      width="20px" 
      fill="#ffffff"
    >
      <path d="M312-144q-29.7 0-50.85-21.15Q240-186.3 240-216v-480h-48v-72h192v-48h192v48h192v72h-48v479.57Q720-186 698.85-165T648-144H312Zm336-552H312v480h336v-480ZM384-288h72v-336h-72v336Zm120 0h72v-336h-72v336ZM312-696v480-480Z"/>
    </svg>
  </button>
</div>
      <ul className="text-left overflow-auto text-sm pt-4">
  {
    recentHistory && recentHistory.map((item, index) => (
      <li 
        className="pl-5 p-3 truncate text-gray-300 cursor-pointer hover:bg-gray-800 hover:text-white border-b border-gray-800 transition-colors duration-200" 
        key={index}
      >
        {item}
      </li>
    ))
  }
</ul>
      </div>
      <div className="col-span-4 p-10">
        <div className="w-full container overflow-x-hidden h-150 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-900 [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="text-white">
            <ul>
              {result.map((item, index) => (
                <div key={index + Math.random()} className={item.type == "q" ? "flex justify-end":""}>
                  {item.type === "q" ? (
                    <li className="text-right p-1 border-8 bg-blue-950 border-blue-950 rounded-tl-3xl rounded-br-3xl rounded-bl-3xl w-fit">
                      <Answers ans={item.text} totalResult={1} index={index} type={item.type} />
                    </li>
                  ) : (
                    item.text.map((ansItem, ansIndex) => (
                      <li
                        key={index + "-" + ansIndex}
                        className="text-left p-1"
                      >
                        <Answers
                          ans={ansItem}
                          totalResult={item.length}
                          index={ansIndex}
                          type={item.type}
                        />
                      </li>
                    ))
                  )}
                </div>
              ))}
            </ul>

            {/* <ul>
{result &&
  result.map((item, index) => (
    <li key={index + Math.random()} className="text-left p-1">
      <Answers ans={item} totalResult={result.length} index={index} />
    </li>
  ))}

            </ul> */}
          </div>
        </div>

        <div className="bg-gray-900 w-1/2 p-5 pr-5 text-white border border-blue-700 rounded-lg m-auto flex">
          <input
            className="w-full h-full p-2 outline-none"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            type="text"
            placeholder="Ask me anything"
          />
          <button
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-800 transition"
            onClick={askQuestion}
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
