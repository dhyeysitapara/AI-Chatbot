import { useEffect, useState } from "react";
import { checkHeading, replaceHeading } from "../helper";

function Answers({ ans, index , totalResult }) {
  const [heading, setHeading] = useState(false);
  const [answer, setAnswer] = useState(ans);
  console.log(index);

  useEffect(() => {
    if (checkHeading(ans)) {
      setHeading(true);
      setAnswer(replaceHeading(ans));
    }
  }, [ans]);

  return (
    <div>
      {
        (index == 0 && totalResult>1? (
          <span className="pt-2 text-xl block text-white">{answer}</span>
        ) : heading ? (
          <span className="pt-2 text-lg block text-white">{answer}</span>
        ) : (
          <span className="pl-5 text-sm">{answer}</span>
        ))
      }
    </div>
  );
}

export default Answers;
