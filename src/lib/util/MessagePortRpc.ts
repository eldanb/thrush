type MessagePortProxyState = {
  pendingCalls: {
    [callId: string]: {
      accept: (success: any) => void,
      reject: (throwable: Error) => void
    }
  }
}

function generateUUID() {
  let
    d = new Date().getTime(),
    d2 = (performance && performance.now && (performance.now() * 1000)) || 0;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
  });
};


export class MessagePortRpcDispatcher<I> {
  constructor(private _port: MessagePort, private _handler: I) {
    _port.onmessage = (event) => {
      this.dispatch(event.data);
    }
  }

  public async dispatch(message: any) {
    const handlerName: string = message.type;
    const messageId: string = message.id;

    const handler: (handledMessage: any) => Promise<any> = (this._handler as any)[handlerName];
    const ret = await handler.apply(this._handler, message.args);

    this._port.postMessage({
      "dir": "resp",
      "id": messageId,
      "ret": ret
    });
  }
}


export function createMessagePortRpcProxy<I>(port: MessagePort): I {
  const state: MessagePortProxyState = {
    pendingCalls: {}
  };

  port.onmessage = (messageEvent) => {
    if(messageEvent.data.dir == "resp") {
      const pendingCall = state.pendingCalls[messageEvent.data.id];
      if(!messageEvent.data.error) {
        pendingCall.accept(messageEvent.data.ret)
      }
    } else {
      console.warn("Invalid response");
    }
  };

  return new Proxy(state,
  {
    get(target, functionName) {
      return (...args: any[]) => {
        const newId = generateUUID();
        const retPromise = new Promise((accept, reject) => {
          state.pendingCalls[newId] = {
            accept: accept,
            reject: reject
          };

          port.postMessage({
            "dir": "req",
            "id": newId,
            "type": functionName,
            "args": args
          });
        });

        return retPromise;
      }
    }
  }) as any;
}
