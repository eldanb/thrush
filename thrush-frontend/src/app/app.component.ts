import { Component, OnInit } from '@angular/core';
import { ThrushEngineService } from './services/thrush-engine.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'thrush';

  constructor(private _thrushEngine: ThrushEngineService) {
  }

  ngOnInit(): void {
   this._thrushEngine.initialize();   
  }
}
