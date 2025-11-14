function App(){
  return(
    <div className="grid grid-cols-5 h-screen text-center">

      <div className = "col-span-1 bg-gray-900">

      </div>


    <div className="col-span-4">

      <div className="container h-160" ></div>

      <div className="bg-gray-900 w-1/2 p-5 pr-5 text-white border border-blue-700 rounded-lg m-auto flex" >
        <input className="w-full h-full p-2 outline-none" type="text" placeholder="Ask me anything" />
        <button className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-800 transition">Enter</button>
      </div>

    </div>




    </div>
  )
}

export default App;