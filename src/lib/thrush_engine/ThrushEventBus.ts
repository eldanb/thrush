import { Subscription } from "rxjs";

export interface ThrushEventBus {
  postEvent(time: number, eventType: string, eventTarget: string, value: any): void;
}

/*export type ThrushEventBusSubscriberFunction = (time: number, eventType: string, eventTarget: string, value: any) => void;

export type ThrushEventBusSubscription = {
  handle: number;
  subscriber: ThrushEventBusSubscriberFunction;
  oneShot: boolean;
  pendingRemoval: boolean;
  topic: string;
}

export class ThrushEventBus {
  private _subscribersByTopic: {
    [topicName: string]: ThrushEventBusSubscription[];
  } = {};
  private _subscribersByHandle: {
    [handle: number]: ThrushEventBusSubscription;
  } = {};
  private _lastHandle: number = 0;

  private _deliveringEvents: boolean = false;
  private _hasGarabge = false;

  constructor() {

  }

  public subscribe(
    subscriber: ThrushEventBusSubscriberFunction, 
    eventType?: string, 
    eventTarget?: string,
    oneShot? : boolean) : number {

    
    const topic = 
      eventType && eventTarget
        ? `${eventType}.${eventTarget}`
        : eventType 
          ? eventType
          : '*';

    const handle = this._lastHandle++;
    
    const subscription: ThrushEventBusSubscription = {
      handle,
      oneShot: oneShot || false,
      subscriber,
      pendingRemoval: false,
      topic
    }
    
    this._subscribersByHandle[handle] = subscription;

    let subscribersByTopicList = this._subscribersByTopic[topic];
    if(!subscribersByTopicList) {
      subscribersByTopicList = [];
      this._subscribersByTopic[topic] = subscribersByTopicList;
    }

    subscribersByTopicList.push(subscription);

    return handle;
  }

  public unsubscribe(handle: number) {
    const subscriberToUnsubscribe = this._subscribersByHandle[handle];
    if(!subscriberToUnsubscribe) {
      return;
    }

    this._hasGarabge = true;

    subscriberToUnsubscribe.pendingRemoval = true;

    if(!this._deliveringEvents) {
      this._garbageCollect();
    }
  }

  public deliverEvent(time: number, type: string, target: string, value: any) {
    const prevDelivering = this._deliveringEvents;
    try {
      this._deliveringEvents = true;
      
      this._subscribersByTopic['*']?.forEach((s) => s.subscriber(time, type, target, value));
      this._subscribersByTopic[type]?.forEach((s) => s.subscriber(time, type, target, value));
      this._subscribersByTopic[`${type}.${target}`]?.forEach((s) => s.subscriber(time, type, target, value));            
    } finally {
      this._deliveringEvents = prevDelivering;
    }

    this._garbageCollect();
  }

  private _garbageCollect() {
    if(!this._hasGarabge) {
      return;
    }

    const pendingRemoval = Object.entries(this._subscribersByHandle)
      .filter(([handle, subscription]) => subscription.pendingRemoval);

    pendingRemoval.forEach(([key, subscription]) => {
      delete this._subscribersByHandle[parseInt(key)];
      const topicList = this._subscribersByTopic[subscription.topic];
      topicList.splice(topicList.indexOf(subscription), 1);
    });

    this._hasGarabge = false;
  }
}*/