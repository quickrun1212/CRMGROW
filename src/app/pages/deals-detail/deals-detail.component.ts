import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreService } from 'src/app/services/store.service';
import { DealsService } from 'src/app/services/deals.service';
import { Deal } from 'src/app/models/deal.model';
import { Contact } from 'src/app/models/contact.model';
import { TabItem } from 'src/app/utils/data.types';
import { MatDialog } from '@angular/material/dialog';
import { CalendarDialogComponent } from 'src/app/components/calendar-dialog/calendar-dialog.component';
import { TaskCreateComponent } from 'src/app/components/task-create/task-create.component';
import { DialogSettings } from 'src/app/constants/variable.constants';
import { SendEmailComponent } from 'src/app/components/send-email/send-email.component';
import { NoteCreateComponent } from 'src/app/components/note-create/note-create.component';
import { DealCreateComponent } from 'src/app/components/deal-create/deal-create.component';
import { DealEditComponent } from 'src/app/components/deal-edit/deal-edit.component';

@Component({
  selector: 'app-deals-detail',
  templateUrl: './deals-detail.component.html',
  styleUrls: ['./deals-detail.component.scss']
})
export class DealsDetailComponent implements OnInit {
  deal = {
    main: new Deal(),
    activities: [],
    contacts: []
  };
  stages: any[] = [];
  selectedStage = '';
  selectedStageId = '';
  dealPanel = true;
  contactsPanel = true;
  tabs: TabItem[] = [
    { icon: '', label: 'Activity', id: 'all' },
    { icon: '', label: 'Notes', id: 'notes' },
    { icon: '', label: 'Emails', id: 'emails' },
    { icon: '', label: 'Texts', id: 'texts' },
    { icon: '', label: 'Appointments', id: 'appointments' },
    { icon: '', label: 'Group Calls', id: 'group_calls' },
    { icon: '', label: 'Tasks', id: 'follow_ups' },
    { icon: '', label: 'Deals', id: 'deals' }
  ];
  action: TabItem = this.tabs[0];

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    public dealsService: DealsService,
    private storeService: StoreService
  ) {
    this.dealsService.getStage(true);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.dealsService.getDeal(id).subscribe((res) => {
        this.deal = res['data'];
        this.deal.contacts = (res['data']['contacts'] || []).map((e) =>
          new Contact().deserialize(e)
        );
        this.getStage(res['data'].main.deal_stage);
        console.log('###', this.deal);
      });
    }
  }

  getStage(id: string): void {
    this.dealsService.stages$.subscribe((res) => {
      this.stages = res;
      if (this.stages.length) {
        this.stages.forEach((stage) => {
          if (stage._id == id) {
            this.selectedStage = stage.title;
            this.selectedStageId = stage._id;
          }
        });
      }
    });
  }

  backTasks(): void {
    this.router.navigate(['./deals']);
  }

  editDeal(): void {
    this.dealPanel = !this.dealPanel;
    this.dialog.open(DealEditComponent, {
      position: { top: '100px' },
      width: '100vw',
      maxWidth: '600px',
      disableClose: true,
      data: {
        deal: this.deal
      }
    });
  }

  addContact(): void {
    this.contactsPanel = !this.contactsPanel;
  }

  changeTab(tab: TabItem): void {
    this.action = tab;
  }

  openAppointmentDlg(): void {
    this.dialog.open(CalendarDialogComponent, {
      position: { top: '100px' },
      width: '100vw',
      maxWidth: '600px',
      maxHeight: '700px'
    });
  }

  openEmailDlg(): void {
    this.dialog.open(SendEmailComponent, {
      position: {
        bottom: '50px',
        right: '50px'
      },
      width: '100vw',
      maxWidth: '650px',
      panelClass: 'send-email',
      backdropClass: 'cdk-send-2email',
      disableClose: false
    });
  }

  openTaskDlg(): void {
    this.dialog.open(TaskCreateComponent, {
      ...DialogSettings.TASK
    });
  }

  openNoteDlg(): void {
    this.dialog.open(NoteCreateComponent, {
      ...DialogSettings.NOTE
    });
  }

  deleteDealDlg(): void {}
}
