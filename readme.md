# Multi Process Utils

This is a work in progress but basically meant to allow arbitrary functions to run in seperate processes. Each function is expected to provide

- a context for the function to run in
  - will be considered the `this` variable
- a function that doesn't require any external variables
  - I'd like to be able to analyze the functions and throw an error if theres unfound variables. No globals allowed. `this` is ok though

From there it either returns void, return a promise<JSON_Unknown>, a transform<JSON_Unknown> or writeable stream
- Perhaps its a good idea to support callbacks and readable streams
- void in the case its a single off writable function that saves to local storage or something. But basically, nothing is expected to come back.

- arbitrary functions
  - the user also provides list of arguments like they would a normal function
- arbitrary transforms
  - they are provided the ability to modify a queue that will get added to their transform after they end their current function and call the callback
    - The queue is an array
    - items get readded from to the queue are pushed into the stream
  - the are provided with a write function so they can write an output
  - they are provided with an end function so they can end their transforms
- Utility transforms
  - expand/Contract with near arbitrary functions
    - functions are expected to return arrays of any json_stringifyable items
      - they don't have to be the original item
    - when they return 0 items, it can be considered a filter
    - when they return 1 item, it can be considered a map
    - when they return more than one item it can be considered an expand
  - reduce functions
    - this requires a bit of waiting
      - while Math.floor(items / 2) threads can be done in parralel
      - if there is an odd man out that individual has to wait for another item to finish until they can combine
      - Then the next one finished has to wait for a next one.
      - technically they should all finish around the same time but it isn't necessarilly the same as all in parrallel
  - map functions
    - basically get an item, run a function and return the value
    - can be considered a type of expand/contract but it can be more optimized
  - filter functions
    - can be considered an expand/contract but maybe more optomized though less flexible
  - foreach writable
    - basically its not expecting any return, thus it can't be considered a transform stream. Its only a writable
- map, reduce and other array and transforms to run in a child process in parrallel
