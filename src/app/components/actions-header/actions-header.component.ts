import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { ActionItem } from 'src/app/utils/data.types';

@Component({
  selector: 'app-actions-header',
  templateUrl: './actions-header.component.html',
  styleUrls: ['./actions-header.component.scss']
})
export class ActionsHeaderComponent implements OnInit {
  @Input('actions') actions: ActionItem[] = [];
  @Output() doCommand: EventEmitter<any> = new EventEmitter();

  showActions: ActionItem[] = [];
  moreActions: ActionItem[] = [];
  constructor() {}

  ngOnInit(): void {
    this.showActions = this.actions.slice(0, 4);
    this.moreActions = this.actions.slice(4);
  }

  runCommand(command: any): void {
    this.doCommand.emit(command);
  }
}
