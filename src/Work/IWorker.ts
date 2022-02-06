import { JSON_Unknown, JSON_Unknown_Object } from "../types/JSON";
import { EventEmitter } from "events";

export interface IWorker {
  sendMessage(message: JSON_Unknown_Object): any;
  addMessageListener(listener: (message: JSON_Unknown)=>any): any;
  addDisconnectListener(listener: ()=>any): any
  addReadyListener(listener: ()=>any): any
  destroy(): any
}
