import { useState } from "react";
import { URL } from "./constants";


function App(){

    const[question,setQuestion] = useState('')
    const[result,setResult] = useState(undefined)

   const payload = {
    "contents": [
      {
        "parts": [
          {
            "text": question
          }
        ]
      }
    ]
  }
  

    const askQuestion = async() => {

      let response = await fetch(URL, {
        method:  "POST",
        body : JSON.stringify(payload)
      })
      
    


   response = await response.json();
    setResult(response.candidates[0].content.parts[0].text)
    }

  return(
    <div className="grid grid-cols-5 h-screen text-center overflow-hidden">

      <div className = "col-span-1 bg-gray-900">

      </div>


    <div className="col-span-4 p-10">

<div className=" w-full container  overflow-x-hidden h-150 overflow-y-auto">

      <div className="text-white ">
        {result}
      </div>



      </div>

      <div className="bg-gray-900 w-1/2 p-5 pr-5 text-white border border-blue-700 rounded-lg m-auto flex" >
        <input className="w-full h-full p-2 outline-none" value = {question} onChange={(event)=> setQuestion(event.target.value)} type="text" placeholder="Ask me anything" />
        <button className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-800 transition" onClick={askQuestion } >Enter</button>
      </div>

    </div>




    </div>
  )
}

export default App;