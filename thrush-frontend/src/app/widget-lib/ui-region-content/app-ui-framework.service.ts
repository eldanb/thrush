import { Injectable, ViewContainerRef } from "@angular/core";
import { BehaviorSubject } from "rxjs";

export type PluggableFrameworkRegion = "toolbar" | "menubar";

@Injectable()
export class AppUiFrameworkService {
  private _pluggableRegionHosts: Partial<Record<PluggableFrameworkRegion, BehaviorSubject<ViewContainerRef | null>>> = {};

  public getRegion(region: PluggableFrameworkRegion): BehaviorSubject<ViewContainerRef | null> {
    if(!this._pluggableRegionHosts[region]) {
      this._pluggableRegionHosts[region] = new BehaviorSubject<ViewContainerRef | null>(null);
    }

    return this._pluggableRegionHosts[region]!;
  }

  public connectRegion(region: PluggableFrameworkRegion, vcr: ViewContainerRef) {
    this.getRegion(region).next(vcr);
  }
}