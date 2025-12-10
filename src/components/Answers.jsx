function Answers({ ans, totalResult, index, type }) {
  
  // Handle user questions
  if (type === "q") {
    return <div className="text-white font-semibold">{ans}</div>;
  }
  
  // Handle AI responses
  const formatResponse = (text) => {
    if (!text) return '';
    
    // Split by code blocks first
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, partIndex) => {
      // Code blocks
      if (part.startsWith('```') && part.endsWith('```')) {
        const match = part.match(/```(\w+)?\n([\s\S]*?)```/);
        const language = match ? match[1] : 'text';
        const code = match ? match[2] : part.slice(3, -3);
        
        return (
          <div key={`code-${partIndex}`} className="my-4">
            <div className="flex justify-between items-center bg-gray-900 px-4 py-2 rounded-t-lg">
              <span className="text-xs text-gray-400 font-mono">{language}</span>
              <button
                onClick={() => navigator.clipboard.writeText(code)}
                className="text-xs text-gray-400 hover:text-white"
              >
                Copy
              </button>
            </div>
            <pre className="bg-gray-900 text-gray-200 p-4 rounded-b-lg overflow-x-auto">
              <code className="text-sm font-mono block whitespace-pre">
                {code}
              </code>
            </pre>
          </div>
        );
      }
      
      // Regular text with paragraphs
      return part.split('\n').map((line, lineIndex) => {
        if (line.trim() === '') return <br key={`br-${lineIndex}`} />;
        
        // Headings
        if (line.match(/^#{1,3}\s/)) {
          const headingLevel = line.match(/^(#{1,3})\s/)[1].length;
          const headingText = line.replace(/^#{1,3}\s/, '');
          const headingClass = headingLevel === 3 ? 'text-xl font-bold my-3' : 
                              headingLevel === 2 ? 'text-2xl font-bold my-4' : 
                              'text-3xl font-bold my-4';
          return <div key={`h-${lineIndex}`} className={`${headingClass} text-white`}>{headingText}</div>;
        }
        
        // Bullet points
        if (line.match(/^[\*\-\+]\s/)) {
          const bulletText = line.substring(2);
          return (
            <div key={`bullet-${lineIndex}`} className="flex items-start mb-2 ml-4">
              <span className="text-gray-400 mr-2">•</span>
              <span className="text-gray-300">{formatInlineText(bulletText)}</span>
            </div>
          );
        }
        
        // Regular text
        return (
          <div key={`text-${lineIndex}`} className="mb-2 text-gray-300">
            {formatInlineText(line)}
          </div>
        );
      });
    });
  };
  
  const formatInlineText = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);
    
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`bold-${i}`} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={`code-${i}`} className="bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };
  
  return (
    <div className="text-gray-300 leading-relaxed">
      {formatResponse(ans)}
    </div>
  );
}

export default Answers;