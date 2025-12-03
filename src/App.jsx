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
      <div className="col-span-1 bg-gray-900">
        <ul>
          {
            recentHistory && recentHistory.map((item , index)=>(
              <li key={index}>
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
