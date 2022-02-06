

var id = 0;
import { MAX_SAFE_NUM } from "../../constants/number";
const MAX_SAFE_NUM_STR = MAX_SAFE_NUM.toString(32);
const MAX_SAFE_NUM_STR_LEN = MAX_SAFE_NUM_STR.length;

export function uniqueId(): string{
  const ret = [
    formatCounter(id),
    formattedDate(),
    formattedRandom(),
  ].join("-");
  id = (id + 1) % MAX_SAFE_NUM;
  return ret;
}

function formatCounter(num: number){
  return enforceStringLength(
    num.toString(32),
    MAX_SAFE_NUM_STR_LEN
  );
}

function formattedDate(){
  return enforceStringLength(
    Date.now().toString(32),
    MAX_SAFE_NUM_STR_LEN
  );
}

function formattedRandom(){
  return enforceStringLength(
    Math.random().toString(32).substring(2),
    MAX_SAFE_NUM_STR_LEN
  );
}

function enforceStringLength(str: string, expectedLength: number){
  if(str.length === expectedLength) return str;
  if(str.length > expectedLength) return str.substring(0, expectedLength);
  return "0".repeat(expectedLength - str.length) + str;
  for(var i = str.length; i < expectedLength; i++){
    // we do it in a loop because we might get a value like 0.25
    // thus we'd have to do it again
    str = (
      Math
      .random()
      .toString(32)
      .substring(2, expectedLength - str.length)
    ) + str;
  }
  return str;
}
