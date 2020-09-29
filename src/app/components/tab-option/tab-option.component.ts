import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TabOption } from 'src/app/utils/data.types';

@Component({
  selector: 'app-tab-option',
  templateUrl: './tab-option.component.html',
  styleUrls: ['./tab-option.component.scss']
})
export class TabOptionComponent implements OnInit {
  @Input('options') options: TabOption[] = [];
  @Input('selected') selected = ''; //corresponds to value of TabOption
  @Output('onChange') onChange = new EventEmitter();

  constructor() {}

  ngOnInit(): void {}

  changeOption(option: TabOption): void {
    this.onChange.emit(option.value);
  }
}
