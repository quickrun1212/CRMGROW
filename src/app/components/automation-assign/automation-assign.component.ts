import {
  Component,
  OnInit,
  OnDestroy,
  Inject,
  ViewChild,
  ElementRef
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AutomationService } from 'src/app/services/automation.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-automation-assign',
  templateUrl: './automation-assign.component.html',
  styleUrls: ['./automation-assign.component.scss']
})
export class AutomationAssignComponent implements OnInit, OnDestroy {

  selectedAutomation: any;

  contacts: any[] = [];

  submitted = false;
  contactOverflow = false;
  loading = false;

  constructor(
    private dialogRef: MatDialogRef<AutomationAssignComponent>,
    private automationService: AutomationService,
    private toastr: ToastrService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.selectedAutomation = this.data.automation;
    }
  }

  ngOnDestroy(): void {}

  assignAutomation(): void {
    this.submitted = true;
    if (!this.selectedAutomation || !this.contacts.length) {
      return;
    }
    this.loading = true;
    const automation = this.selectedAutomation._id;
    const contacts = [];
    this.contacts.forEach((e) => {
      contacts.push(e._id);
    });

    this.automationService.bulkAssign(contacts, automation).subscribe(
      (res) => {
        this.loading = false;
        this.dialogRef.close({ status: true });
        this.toastr.success(
          'Automation is assigned to selected contacts successfully.'
        );
      },
      (err) => {
        this.loading = false;
        this.dialogRef.close({ status: true });
      }
    );
  }

  addContacts(contact): any {
    if (contact) {
      if (this.contacts.length === 15) {
        this.contactOverflow = true;
        return;
      } else if (contact && this.contacts.length < 15) {
        const index = this.contacts.findIndex((item) => item._id === contact._id);
        if (index < 0) {
          this.contacts.push(contact);
        }
      }
    }
  }

  removeContact(contact): void {
    const index = this.contacts.findIndex((item) => item._id === contact._id);
    if (index >= 0) {
      this.contacts.splice(index, 1);
      this.contactOverflow = false;
    }
  }
}
