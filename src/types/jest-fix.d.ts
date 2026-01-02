// Fix for Jest types referencing missing ESNext.Disposable
// This provides a minimal definition to satisfy the Jest types requirement

declare namespace ESNext {
  interface Disposable {
    [Symbol.dispose](): void;
  }
  
  interface AsyncDisposable {
    [Symbol.asyncDispose](): Promise<void>;
  }
}

// Declare the disposable symbols if they don't exist
declare global {
  namespace Symbol {
    const dispose: unique symbol;
    const asyncDispose: unique symbol;
  }
}