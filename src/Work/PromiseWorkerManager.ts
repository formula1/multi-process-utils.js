import { JSON_Unknown } from "../types/JSON";
import { uniqueId } from "../util/string";
import { MAX_SAFE_NUM } from "../constants/number";
import { RunMessage, RunTypes } from "./Message";
import { IWorker } from "./IWorker";
import { EventEmitter } from "events";

type TConfig = {
  numberOfWorkers: number,
  keepAlive?: boolean
  unresponsiveTimeout?: number
}

type TManagable = {
  id: string
  worker: IWorker
  pingTimeout?: number
}

type TResolveableMessage = {
  id: string,
  message: RunMessage,
  resrej: [(o: JSON_Unknown)=>any, (e: JSON_Unknown)=>any]
}


export abstract class WorkerManager extends EventEmitter {
  private queue: Array<TResolveableMessage> = []
  public keepAlive: boolean;
  private managableMap: {
    [managableId: string]: TManagable
  } = {};
  private availableManagables: Array<TManagable> = [];
  private activeWorkByManagable: {
    [managableId: string]: {
      [messageId: string]: TResolveableMessage
    }
  } = {};
  private activeManagableByWork: {
    [messageId: string]: TManagable
  };

  constructor({ numberOfWorkers, keepAlive, unresponsiveTimeout }: TConfig){
    if(typeof numberOfWorkers !== "number" || !(numberOfWorkers > 0)){
      throw new Error("numberOfWorkers needs to be set to a number")
    }
    if(!(numberOfWorkers > 0)){
      throw new Error("numberOfWorkers needs to be > 0")
    }
    if(numberOfWorkers > MAX_SAFE_NUM){
      throw new Error("numberOfWorkers needs to be < " + (MAX_SAFE_NUM + 1))
    }
    this.keepAlive = !!keepAlive;
    if(!keepAlive) return;
    for(var i = 0; i < numberOfWorkers; i++){
      this.createAndSetupWorker();
    }
  }
  abstract createWorker(): IWorker
  createAndSetupWorker(){
    const worker = this.createWorker();
    const managable = {
      id: uniqueId(),
      worker: worker
    }
    worker.addReadyListener(()=>{
      this.managableIsFree(managable)
    })
    worker.addMessageListener((message)=>{
      this.handleResultMessage(message)
    })
  }
  runFn(context: JSON_Unknown, fn: Function, ...args: Array<JSON_Unknown>){
    return new Promise((res, rej)=>{
      const id = uniqueId()
      const resolveableMessage: TResolveableMessage = {
        id: id,
        message: {
          id: id,
          type: RunTypes.function,
          context: context,
          functionString: fn.toString(),
          args: args
        },
        resrej: [res, rej]
      }
      if(this.availableManagables.length === 0){
        return this.queue.push(resolveableMessage)
      }
      this.giveManagableWork(
        this.availableManagables.shift(),
        resolveableMessage
      )
    });
  }
  giveManagableWork(manageable: TManagable, rMessage: TResolveableMessage){
    this.activeManagableByWork[rMessage.id] = manageable;
    this.activeWorkByManagable[manageable.id][rMessage.id] = rMessage;
    manageable.worker.sendMessage(rMessage.message);
  }

  handleMessageFromWorker(manageable: TManagable, message: JSON_Unknown){
    try {
      if(typeof message !== "object"){
        throw new Error("Recieved message that was not an object")
      }
      if(Array.isArray(message)){
        throw new Error("Recieved message that was an array")
      }
      switch(message.type){
        case "ping": {
          return manageable.worker.sendMessage({
            type: "pong"
          })
        }
        case "result": {
          if(typeof message.id !== "string"){
            throw new Error("Recieved message without an id")
          }
          const reso
        }
        default: {
          throw new Error("Recieved a message with an invalid type");
        }
      }
    }catch(e){
      this.emit("error", e);
    }

  }
  managableIsFree(managable: TManagable){
    if(this.queue.length === 0){
      if(this.keepAlive){
        return this.availableManagables.push(managable)
      }
      return this.destroyManagable(managable);
    }
    this.giveManagableWork(
      managable, this.queue.shift()
    )
  }

  destroyManagable(manageable: TManagable){
    delete this.activeWorkByManagable[manageable.id]
    delete this.managableMap[manageable.id];
    clearTimeout(manageable.pingTimeout);
    manageable.worker.destroy()
  }
}
