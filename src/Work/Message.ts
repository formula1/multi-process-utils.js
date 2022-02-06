import { JSON_Unknown } from "../types/JSON";

export const WantMoreWork = {
  type: "want more work"
}

export type ReturnMessage = {
  type: "result",
  id: string,
  isError: boolean,
  value: JSON_Unknown
}

export type RunMessage = (
  | FunctionMessage
  | SetMessage
  | RequireMessage
  | UrlMessage
);

export enum RunTypes {
  function = "function",
  set = "set",
  require = "require",
  url = "url"
}

export type FunctionMessage = RunMessageBase & {
  type: RunTypes.function,
  functionString: string
}

export type SetMessage = RunMessageBase & {
  type: RunTypes.set,
  functionName: string
}

export type RequireMessage = RunMessageBase & {
  type: RunTypes.require,
  fsPath: string
  jsonPath?: string
}

// Should handle http, blockchain and torrent
export type UrlMessage = RunMessageBase & {
  type: RunTypes.url,
  url: string,
  jsonPath?: string
}


type RunMessageBase = {
  id: string,
  context?: JSON_Unknown,
  args: Array<JSON_Unknown>
}



export type PingMessage = {
  type: "ping"
}

export type PongMessage = {
  type: "pong"
}
