export class ChannelAllocationManager {  
  private _allocationPool: number[];
  private _allocated: number[] = [];
  private _masterAllocator: ChannelAllocationManager | null;

  constructor(master: ChannelAllocationManager);
  constructor(intialPool: number[]);
  constructor(masterOrInitialPool: ChannelAllocationManager | number[]) {
    if(masterOrInitialPool instanceof ChannelAllocationManager) {
      this._masterAllocator = masterOrInitialPool;
      this._allocationPool = [];
    } else {
      this._allocationPool = masterOrInitialPool;
      this._masterAllocator = null;
    }
  }

  allocateChannel(): number {
    let allocatedChannel = this._allocationPool.pop();
    if(allocatedChannel == undefined && this._masterAllocator) {
      allocatedChannel =this._masterAllocator.allocateChannel();
    }

    if(allocatedChannel == undefined) {
      throw new Error("Can't allocate channel");
    }

    this._allocated.push(allocatedChannel);
    return allocatedChannel;    
  }

  releaseChannel(channel: number) {
    let channelIndexInAllocated = this._allocated.indexOf(channel);
    if(channelIndexInAllocated<0) {
      throw new Error("Can't deallocate a non-allocated channel");
    }

    this._allocated.splice(channelIndexInAllocated, 1);

    this._allocationPool.push(channel);
  }

  returnToMaster(): void {
    if(this._allocated.length) {
      throw new Error("Attempt to return channels to master with allocated channels.");
    }

    const masterAllocator = this._masterAllocator;
    if(masterAllocator) {
      this._allocationPool.forEach((channel) => {
        masterAllocator.releaseChannel(channel);
      })
    };

    this._allocationPool = [];
  }
}
