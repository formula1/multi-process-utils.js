import { Transform } from "stream";

const SymIndex = Symbol("Parrallel Combine Index");
export class ParrallelReduceTransform<T> extends Transform {
  constructor(workerManager, combineContext, combineFn, initialValue){
    super({ objectMode: true });
    this.hasItem = false;
    this.currentIndex = 0;
    this.currentItem;
    this.runItem = workerManager.runFn.bind(
      workerManager,
      processContext,
      processFn
    );
    this.rejected = false;
    this.promiseQueue = {}
    this.unadded = {}
    this.push({
      indexes: [-1],
      value: initialValue
    })
  }
  async _transform(unknownItem, callback){
    callback();
    item = (
      typeof unknownItem === "object" && SymIndex in unknownItem
    ) ? unknownItem : {
      [SymIndex]: [this.currentIndex++],
      value: unknownItem
    }
    if(!this.hasItem){
      this.currentItem = item;
      this.hasItem = true;
      return;
    }
    this.hasItem = false;
    const p = this._runner(item);
    this.promiseQueue[itemIndex] = p;
    await p;
    delete this.promiseQueue[itemIndex];
  }
  // Despite how simple this is we want to ensure that the flush
  // waits for the push to happen
  // otherwise the promise.all would resolve before the last pushes
  async _runner(item, index){
    try {
      const combinedItem = await this.runItem([
        this.currentItem.value, item.value,
        this.currentItem[SymIndex], item[SymIndex]
      ])
      if(this.rejected) return;
      this.push({
        [SymIndex]: this.currentItem[SymIndex].concat(item[SymIndex]),
        value: combinedItem
      })
    }catch(e){
      if(this.rejected) return;
      this.rejected = true;
      this.emit("error", e);
    }
  }
  async _flush(cb){
    try {
      do {
        const promises = Object.values(this.promiseQueue);
        await Promise.all(promises);
      }while(promises.length > 1);
      // The last item should be stored in current item
      this.write(this.currentItem)
      cb();
    }catch(e){
      cb(e);
    }
  }
}


async function parrallelReduce(
  workerManager,
  processContext, processFn, array,
  combineContext, combineFn, initialValue
){
  return new Promise((res, rej)=>{
    arrayToStream(array)
    .pipe(
      new ParrallelMap(
        workerManager, processContext, processFn
      )
    ).pipe(
      new ParrallelUnindexedCombine(
        workerManager, combineContext, combineFn
      )
    ).on("data", res)
    .on("error", res)
  })
}
