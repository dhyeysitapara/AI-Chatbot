import { useEffect, useState } from "react";

// Helper functions (defined locally instead of importing)
const checkheading = (text) => {
  return text?.trim().startsWith('#');
};

const replaceHeading = (text) => {
  return text?.replace(/^#+\s*/, '');
};

function Answers({ ans, totalResult, index, type }) {
  const [heading, setHeading] = useState(false);

  useEffect(() => {
    const isHeading = checkheading(ans);
    setHeading(isHeading);
  }, [ans]);

  // Function to parse bold text (**text**)
  const formatText = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div>
      {type === "q" ? (
        <div className="text-white">{ans}</div>
      ) : heading ? (
        <div className="font-bold text-2xl text-white my-4">
          {replaceHeading(ans)}
        </div>
      ) : (
        <div className="text-white leading-relaxed">
          {ans.split('\n').map((line, i) => (
            <p key={i} className="mb-2">
              {formatText(line)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default Answers;