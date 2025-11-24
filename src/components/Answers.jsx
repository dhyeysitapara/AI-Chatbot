import { useEffect, useState } from "react";
import { checkHeading, replaceHeading } from "../helper";

function Answers({ ans, index , totalResult , type }) {
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
          <span className={type=="q"?"pl-1" : "pl-5" }>{answer}</span>
        ))
      }
    </div>
  );
}

export default Answers;
