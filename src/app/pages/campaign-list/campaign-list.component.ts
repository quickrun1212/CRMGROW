import {
  Component,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  EventEmitter
} from '@angular/core';
import { Location } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { SelectionModel } from '@angular/cdk/collections';
import { CampaignAddListComponent } from '../../components/campaign-add-list/campaign-add-list.component';
import { ActionItem } from '../../utils/data.types';
import { AdvancedFilterDemoComponent } from '../../components/advanced-filter-demo/advanced-filter-demo.component';
import { ManageLabelComponent } from '../../components/manage-label/manage-label.component';
import { MailListService } from '../../services/maillist.service';

@Component({
  selector: 'app-campaign-list',
  templateUrl: './campaign-list.component.html',
  styleUrls: ['./campaign-list.component.scss']
})
export class CampaignListComponent implements OnInit {
  lists = [];
  listCount;
  selected = 1;
  selectedLists = new SelectionModel<any>(true, []);

  @Output() onDetail: EventEmitter<string> = new EventEmitter();
  constructor(
    private location: Location,
    private dialog: MatDialog,
    private mailListService: MailListService
  ) {}

  ngOnInit(): void {
    this.loadList();
  }

  loadList(): void {
    this.mailListService.getList().subscribe((res) => {
      this.lists = res;
    });
  }

  /**
   * Emit the Parent Event to go to detail page
   * @param id : list ID
   */
  goToDetailPage(id: string): void {
    this.onDetail.emit(id);
  }

  isSelectedPage(): any {
    if (this.lists.length) {
      for (let i = 0; i < this.lists.length; i++) {
        const e = this.lists[i];
        if (!this.selectedLists.isSelected(e._id)) {
          return false;
        }
      }
    }
    return false;
  }

  selectAllPage(): void {
    if (this.isSelectedPage()) {
      this.lists.forEach((e) => {
        if (this.selectedLists.isSelected(e._id)) {
          this.selectedLists.deselect(e._id);
        }
      });
    } else {
      this.lists.forEach((e) => {
        if (!this.selectedLists.isSelected(e._id)) {
          this.selectedLists.select(e._id);
        }
      });
    }
  }

  addList(): void {
    this.dialog
      .open(CampaignAddListComponent, {
        width: '96vw',
        maxWidth: '500px',
        height: 'auto',
        disableClose: true
      })
      .afterClosed()
      .subscribe((res) => {
        if (res) {
          this.lists.push(res.data);
        }
      });

    // this.dialog
    //   .open(AdvancedFilterDemoComponent, {
    //     width: '96vw',
    //     maxWidth: '550px',
    //     height: 'auto',
    //     disableClose: true
    //   })
    //   .afterClosed()
    //   .subscribe((res) => {
    //     if (res) {
    //
    //     }
    //   });

    // this.dialog
    //   .open(ManageLabelComponent, {
    //     width: '96vw',
    //     maxWidth: '550px',
    //     height: 'auto',
    //     disableClose: true
    //   })
    //   .afterClosed()
    //   .subscribe((res) => {
    //     if (res) {
    //
    //     }
    //   });
  }

  editList(list): void {}

  doAction(action: any): void {
    console.log('action', action);
  }

  actions: ActionItem[] = [
    {
      icon: 'i-message',
      label: 'Merge list',
      type: 'button'
    },
    {
      icon: 'i-message',
      label: 'Delete list',
      type: 'button'
    },
    {
      spliter: true,
      label: 'Select All',
      type: 'button'
    },
    {
      label: 'Deselect',
      type: 'button'
    }
  ];
}
