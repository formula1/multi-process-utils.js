import { JSON_Unknown, JSON_Object, JSON_FlexibleFn } from "../types/JSON";
import { WantMoreWork, ReturnMessage, ErrorMessage } from "./Message"
import { IWorker } from "./IWorker";

export abstract class Worker implements IWorker {
  setFns: { [key: string]: JSON_FlexibleFn }
  required: { [key: string]: JSON_FlexibleFn }
  urls: { [key: string]: JSON_FlexibleFn }

  constructor(){
    this.addMessageListener(this.handleMessage.bind(this));
  }
  abstract addReadyListener(listener: (message: JSON_Object)=>any): any
  abstract addMessageListener(listener: (message: JSON_Object)=>any ): any
  abstract addDisconnectListener(listener: (message: JSON_Object)=>any ): any
  abstract sendMessage(message: JSON_Object): any
  abstract destroy(): any

  async handleMessage(unknown: JSON_Unknown){
    if(typeof unknown !== "object"){
      throw new Error("messages must be objects");
    }
    if(Array.isArray(unknown)){
      throw new Error("messages cannot be arrays");
    }
    const id = unknown.id;
    if(typeof id !== "string"){
      throw new Error("bad id")
    }
    Promise.resolve().then(()=>{
      return this.sendMessage(WantMoreWork)
    })
    try {
      const v = this.runFn(unknown);
      if(typeof v !== "object" || !(v instanceof Promise)){
        return this.sendMessage({
          id: id,
          type: "return",
          value: v
        });
      }
      return this.sendMessage({
        id: id,
        type: "return",
        value: await v
      });

    }catch(e){
      if(e instanceof Error){
        return this.sendMessage({
          id: id,
          type: "error",
          value: {
            message: e.message,
            stack: e.stack
          }
        })
      }
      return this.sendMessage({
        id: id,
        type: "error",
        value: e
      })
    }
  }

  runFn(maybeMessage: JSON_Object){
    const { type, args, context } = maybeMessage;
    if(typeof type !== "string"){
      throw new Error("each message must have a type")
    }
    if(!Array.isArray(args)){
      throw new Error("args needs to be an array")
    }
    switch(type){
      case "function": {
        const fnStr = maybeMessage.functionString
        if(typeof fnStr !== "string"){
          throw new Error("for type function, it needs a function string")
        }
        const fn = new Function(fnStr);
        return fn.apply(context, args);
      }
      case "set": {
        const name = maybeMessage.functionName;
        if(typeof name !== "string"){
          throw new Error(
            "for type set, the function needs to have been set externally"
          )
        }
        if(!(name in this.setFns)){
          throw new Error("The provided name is not available");
        }
        return this.setFns[name].apply(context, args);
      }
      case "require": {
        const fsPath = maybeMessage.fsPath;
        if(typeof fsPath !== "string"){
          throw new Error(
            "for type set, the function needs to have been set externally"
          )
        }
        const jsonPath = maybeMessage.jsonPath;
        if(typeof jsonPath !== "string"){
          throw new Error(
            "the json path needs to be a string"
          )
        }
        if(!(fsPath in this.required)){
          // Require may fail
          this.required[fsPath] = require(fsPath);
        }
        const found = resolveJSONPathOnObject(
          jsonPath, this.required[fsPath]
        );
        return found.apply(context, args);
      }
      case "url": {
        const url = maybeMessage.url;
        if(typeof url !== "string"){
          throw new Error(
            "for type set, the function needs to have been set externally"
          )
        }
        const jsonPath = maybeMessage.jsonPath;
        if(typeof jsonPath !== "string"){
          throw new Error(
            "the json path needs to be a string"
          )
        }
        if(!(url in this.urls)){
          // Require may fail
          this.urls[url] = require(url);
        }
        const found = resolveJSONPathOnObject(
          jsonPath, this.urls[url]
        );
        return found.apply(context, args);
      }
    }
    throw new Error("couldn't handle the function type");
  }
}


function resolveJSONPathOnObject(jsonPath: string, originalObj: any){
  const found = jsonPath.split(".").reduce((obj: any, path: string)=>{
    if(typeof obj === "undefined"){
      throw new Error(
        "The json path resolves to undefined when requiring a library"
      );
    }
    if(!(path in obj)){
      throw new Error("Missing key from library")
    }
    return obj[path];
  }, originalObj)
  if(typeof found !== "function"){
    throw new Error("the specified json path doesn't resolve to a function")
  }
  return found;
}
