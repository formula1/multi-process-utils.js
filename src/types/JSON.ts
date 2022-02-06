
export type JSON_Primitives = boolean | number | string;
export type JSON_Array = Array<JSON_Primitives | JSON_Object | JSON_Array>
export type JSON_Object = {
  [key: string]: JSON_Primitives | JSON_Object | JSON_Array
}

export type JSON_Strict = JSON_Primitives | JSON_Object | JSON_Array

export type JSON_Unknown_Primitives = void | JSON_Primitives
export type JSON_Unknown_Object = {
  [key: string]: (
    | JSON_Unknown_Primitives
    | JSON_Unknown_Object
    | JSON_Unknown_Array
  )
};
export type JSON_Unknown_Array = Array<(
  | JSON_Unknown_Primitives
  | JSON_Unknown_Object
  | JSON_Unknown_Array
)>
export type JSON_Unknown = (
  | JSON_Unknown_Primitives
  | JSON_Unknown_Object
  | JSON_Unknown_Array
);


export type JSON_FlexibleFn = (...args: Array<JSON_Unknown>)=>JSON_Unknown
