async function parralSimpleMap(workerManager, context, fn, array){
  return Promise.all(array.map((item)=>{
    workerManager.runFn(
      fn, context, [item]
    )
  }));
}

async function parrallelMapCancelable(workerManager, context, fn, array){
  const unadded = {};
  const finished = [];
  const promises = {};
  return new Promise((res, rej)=>{
    array.forEach(sendWork);

    async function sendWork(item, index){
      try {
        // Perhaps the workerManager returns a cancelable promise
        const cancelablePromise = await workerManager.runFn(
          fn, context, [item]
        )
        promises[index] = cancelablePromise;
        const recievedItem = await cancelablePromise;
        delete promises[index];
        if(index !== finished.length){
          return unadded[index] = recievedItem;
        }
        finished.push(recievedItem);
        while(finished.length < array.length){
          if(!(finished.length in unadded)) return;
          finished.push(unadded[finished.length])
        }
        res(finished);
      }catch(e){
        delete promises[index];
        Object.values(promises).forEach((p) => {
          p.cancel();
        });
        return rej(e);
      }
    }

  })
}

async function parrallelMapAllowedToFinish(workerManager, context, fn, array){
  const unadded = {};
  const finished = [];
  const rejected = false;
  return new Promise((res, rej)=>{
    array.forEach(sendWork);

    async function sendWork(item, index){
      try {
        // Perhaps the workerManager returns a cancelable promise
        const recievedItem = await workerManager.runFn(
          fn, context, [item]
        )
        if(rejected) return;
        if(index !== finished.length){
          return unadded[index] = recievedItem;
        }
        finished.push(recievedItem);
        while(finished.length < array.length){
          if(!(finished.length in unadded)) return;
          finished.push(unadded[finished.length])
        }
        res(finished);
      }catch(e){
        if(rejected) return;
        rejected = true;
        return rej(e);
      }
    }

  })
}

class ParrallelMap extends Transform {
  constructor(workerManager, processContext, processFn){
    super({ objectMode: true });
    this.index = 0;
    this.resolvedIndex = 0;
    this.runItem = workerManager.runFn.bind(
      workerManager,
      processContext,
      processFn
    );
    this.rejected = false;
    this.promiseQueue = {}
    this.unadded = {}
  }
  async _transform(item, callback){
    callback();
    const itemIndex = this.index;
    this.index++;
    const p = this._runner(item, index);
    this.promiseQueue[itemIndex] = p;
    await p;
    delete this.promiseQueue[itemIndex];
  }
  async _runner(item, index){
    try {
      const recievedItem = await this.runItem([item])
      if(rejected) return;
      if(index !== this.resolvedIndex){
        return this.unadded[index] = recievedItem;
      }
      this.write(recievedItem);
      this.resolvedIndex++;
      while(this.resolvedIndex < this.index){
        if(!(this.resolvedIndex in unadded)) return;
        finished.push(this.unadded[this.resolvedIndex])
        delete this.unadded[this.resolvedIndex]
        this.resolvedIndex++;
      }
    }catch(e){
      if(this.rejected) return;
      this.rejected = true;
      this.emit("error", e);
    }
  }
  _flush(cb){
    // SHould never be called if rejected
    Promise.all(Object.values(this.promiseQueue))
    .then(()=>(cb()))
    .catch(cb)
  }
}

const SymIndex = Symbol("Parrallel Combine Index");
class ParrallelCombine extends Transform {
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
    item = SymIndex in unknownItem ? unknownItem : {
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
