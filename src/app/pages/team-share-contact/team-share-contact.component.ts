import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { UploadContactsComponent } from 'src/app/components/upload-contacts/upload-contacts.component';
import {
  BulkActions,
  CONTACT_SORT_OPTIONS,
  DialogSettings,
  STATUS
} from 'src/app/constants/variable.constants';
import { Contact, ContactActivity } from 'src/app/models/contact.model';
import { ContactService } from 'src/app/services/contact.service';
import { StoreService } from 'src/app/services/store.service';
import { SearchOption } from 'src/app/models/searchOption.model';
import { UserService } from '../../services/user.service';
import * as _ from 'lodash';
import { saveAs } from 'file-saver';
import { MatDrawer } from '@angular/material/sidenav';
import { Subscription } from 'rxjs';
import { ContactBulkComponent } from 'src/app/components/contact-bulk/contact-bulk.component';
import { NoteCreateComponent } from 'src/app/components/note-create/note-create.component';
import { TaskCreateComponent } from 'src/app/components/task-create/task-create.component';
import { HandlerService } from 'src/app/services/handler.service';
import { ContactAssignAutomationComponent } from '../../components/contact-assign-automation/contact-assign-automation.component';
import { ContactCreateComponent } from 'src/app/components/contact-create/contact-create.component';
import { ConfirmComponent } from 'src/app/components/confirm/confirm.component';
import { SendEmailComponent } from 'src/app/components/send-email/send-email.component';
import { NotifyComponent } from 'src/app/components/notify/notify.component';

@Component({
  selector: 'app-team-share-contact',
  templateUrl: './team-share-contact.component.html',
  styleUrls: ['./team-share-contact.component.scss']
})
export class TeamShareContactComponent implements OnInit, OnChanges {
  STATUS = STATUS;
  ACTIONS = BulkActions.Contacts;
  DISPLAY_COLUMNS = [
    'select',
    'contact_name',
    'contact_label',
    'activity',
    'contact_tags',
    'contact_email',
    'contact_phone',
    'contact_address'
  ];
  SORT_TYPES = [
    { id: 'alpha_up', label: 'Alphabetical Z-A' },
    { id: 'alpha_down', label: 'Alphabetical A-Z' },
    { id: 'last_added', label: 'Last added' },
    { id: 'last_active', label: 'Last activity' }
  ];
  PAGE_COUNTS = [
    { id: 8, label: '8' },
    { id: 10, label: '10' },
    { id: 25, label: '25' },
    { id: 50, label: '50' }
  ];

  @Input('contacts') contacts: any[] = [];
  @ViewChild('drawer') drawer: MatDrawer;
  @ViewChild('editPanel') editPanel: ContactBulkComponent;
  panelType = '';

  sortType = this.SORT_TYPES[1];
  pageSize = this.PAGE_COUNTS[3];
  page = 1;
  searchOption: SearchOption = new SearchOption();
  searchStr = '';

  selecting = false;
  selectSubscription: Subscription;
  selectSource = '';
  selection: Contact[] = [];
  pageSelection: Contact[] = [];
  pageContacts: any[] = [];

  // Variables for Label Update
  isUpdating = false;
  updateSubscription: Subscription;
  filteredResult: Contact[] = [];

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    public storeService: StoreService,
    public contactService: ContactService,
    public userService: UserService,
    private handlerService: HandlerService,
    private dialog: MatDialog
  ) {}

  ngOnDestroy(): void {
    this.handlerService.pageName.next('');
  }

  ngOnInit(): void {
    this.handlerService.pageName.next('contacts');

    this.pageContacts = [...this.contacts];
    this.filteredResult = [...this.contacts];

    this.pageSelection = [];
    this.selection = [];
  }

  ngOnChanges(changes): void {
    if (changes.contacts && changes.contacts.currentValue) {
      this.pageContacts = [...changes.contacts.currentValue];
    }
  }
  /**
   * Load the contacts: Advanced Search, Normal Search, API Call
   */
  load(): void {
    this.page = 1;
  }
  /**
   * Load the page contacts
   * @param page : Page Number to load
   */
  changePage(page: number): void {
    this.page = page;
    if (!this.searchStr && this.searchOption.isEmpty()) {
      // Normal Load by Page
      let skip = (page - 1) * this.pageSize.id;
      skip = skip < 0 ? 0 : skip;
      this.contactService.load(skip);
    } else {
      // Change the Page Selection
      let skip = (page - 1) * this.pageSize.id;
      skip = skip < 0 ? 0 : skip;
      // Reset the Page Contacts
      const contacts = this.storeService.pageContacts.getValue();
      this.pageContacts = contacts.slice(skip, skip + this.pageSize.id);
      // Clear the page selection
      this.pageSelection = _.intersectionBy(
        this.selection,
        this.pageContacts,
        '_id'
      );
    }
  }
  /**
   * Change the Page Size
   * @param type : Page size information element ({id: size of page, label: label to show UI})
   */
  changePageSize(type: any): void {
    const currentSize = this.pageSize.id;
    this.pageSize = type;
    this.contactService.pageSize.next(this.pageSize.id);
    // Check with the Prev Page Size
    if (currentSize < this.pageSize.id) {
      // If page size get bigger
      const loaded = this.page * currentSize;
      let newPage = Math.floor(loaded / this.pageSize.id);
      newPage = newPage > 0 ? newPage : 1;
      this.changePage(newPage);
    } else {
      // if page size get smaller: TODO -> Set Selection and Page contacts
      if (this.searchOption.isEmpty() && !this.searchStr) {
        const skipped = (this.page - 1) * currentSize;
        const newPage = Math.floor(skipped / this.pageSize.id) + 1;
        this.changePage(newPage);
      } else {
        this.changePage(this.page);
      }
    }
  }
  /**
   * Change the sort column and dir
   * @param type: Sort Type
   */
  changeSort(type: any): void {
    this.sortType = type;
    this.contactService.sort.next({
      ...CONTACT_SORT_OPTIONS[type.id],
      page: this.page
    });
  }

  /**
   * Change the search str
   */
  changeSearchStr(): void {
    const reg = new RegExp(this.searchStr, 'gi');
    const filtered = this.pageContacts.filter((item) => {
      return reg.test(item.first_name + item.last_name);
    });
    this.filteredResult = filtered;
    this.page = 1;
  }

  clearSearchStr(): void {
    this.filteredResult = this.pageContacts;
    this.deselectAll();
  }

  /**
   * Toggle All Elements in Page
   */
  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selection = _.differenceBy(
        this.selection,
        this.pageSelection,
        '_id'
      );
      this.pageSelection = [];
      return;
    }
    this.pageContacts.forEach((e) => {
      if (!this.isSelected(e)) {
        const contact = new Contact().deserialize(e);
        this.pageSelection.push(contact);
        this.selection.push(contact);
      }
    });
  }
  /**
   * Toggle Element
   * @param contact : Contact
   */
  toggle(contact: ContactActivity): void {
    const selectedContact = new Contact().deserialize(contact);
    const toggledSelection = _.xorBy(
      this.pageSelection,
      [selectedContact],
      '_id'
    );
    this.pageSelection = toggledSelection;

    const toggledAllSelection = _.xorBy(
      this.selection,
      [selectedContact],
      '_id'
    );
    this.selection = toggledAllSelection;
  }
  /**
   * Check contact is selected.
   * @param contact : ContactActivity
   */
  isSelected(contact: ContactActivity): boolean {
    const index = this.pageSelection.findIndex((item) => item._id === contact._id);
    if (index >= 0) {
      return true;
    }
    return false;
  }
  /**
   * Check all contacts in page are selected.
   */
  isAllSelected(): boolean {
    if (this.selection.length === this.pageContacts.length) {
      this.updateSelectActionStatus(false);
    } else {
      this.updateSelectActionStatus(true);
    }
    return this.pageSelection.length === this.pageContacts.length;
  }

  openFilter(): void {}

  createContact(): void {
    this.dialog.open(ContactCreateComponent, DialogSettings.CONTACT);
  }

  importContacts(): void {
    this.dialog.open(UploadContactsComponent, DialogSettings.UPLOAD);
  }

  /**
   * Open the contact detail page
   * @param contact : contact
   */
  openContact(contact: ContactActivity): void {
    this.router.navigate([`contacts/${contact._id}`]);
  }

  /**
   * Update the Label of the current contact or selected contacts.
   * @param label : Label to update
   * @param _id : id of contact to update
   */
  updateLabel(label: string, _id: string): void {
    const newLabel = label ? label : null;
    let ids = [];
    this.selection.forEach((e) => {
      ids.push(e._id);
    });
    if (ids.indexOf(_id) === -1) {
      ids = [_id];
    }
    this.isUpdating = true;
    this.contactService
      .bulkUpdate(ids, { label: newLabel }, {})
      .subscribe((status) => {
        this.isUpdating = false;
        if (status) {
          this.handlerService.bulkContactUpdate$(ids, { label: newLabel }, {});
        }
      });
  }

  /**
   * Run the bulk action
   * @param event Bulk Action Command
   */
  doAction(event: any): void {
    switch (event.command) {
      case 'deselect':
        this.deselectAll();
        break;
      case 'select':
        this.selectAll(true);
        break;
      case 'delete':
        this.deleteConfirm();
        break;
      case 'edit':
        this.bulkEdit();
        break;
      case 'download':
        this.downloadCSV();
        break;
      case 'message':
        this.openMessageDlg();
        break;
      case 'add_note':
        this.openNoteDlg();
        break;
      case 'add_task':
        this.openTaskDlg();
        break;
      case 'automation':
        this.openAutomationDlg();
        break;
    }
  }

  /**
   * Update the Command Status
   * @param command :Command String
   * @param loading :Whether current action is running
   */
  updateActionsStatus(command: string, loading: boolean): void {
    this.ACTIONS.some((e) => {
      if (e.command === command) {
        e.loading = loading;
        return true;
      }
    });
  }

  updateSelectActionStatus(status: boolean): void {
    this.ACTIONS.some((e) => {
      if (e.command === 'select') {
        e.spliter = status;
      }
    });
  }

  /**
   * Download CSV
   */
  downloadCSV(): void {
    const ids = [];
    this.selection.forEach((e) => {
      ids.push(e._id);
    });
    this.updateActionsStatus('download', true);
    this.contactService.downloadCSV(ids).subscribe((data) => {
      const contacts = [];
      data.forEach((e) => {
        const contact = {
          first_name: e.contact.first_name,
          last_name: e.contact.last_name,
          email: e.contact.email,
          phone: e.contact.phone,
          source: e.contact.source,
          brokerage: e.contact.brokerage,
          city: e.contact.city,
          state: e.contact.state,
          zip: e.contact.zip,
          address: e.contact.address
        };
        const notes = [];
        if (e.note && e.note.length) {
          e.note.forEach((note) => {
            notes.push(note.content);
          });
        }
        let label = '';
        if (e.contact.label) {
          label = e.contact.label.name || '';
        }
        contact['note'] = notes.join('     ');
        contact['tags'] = e.contact.tags.join(', ');
        contact['label'] = label;
        contacts.push(contact);
      });
      if (contacts.length) {
        const replacer = (key, value) => (value === null ? '' : value); // specify how you want to handle null values here
        const header = Object.keys(contacts[0]);
        const csv = contacts.map((row) =>
          header
            .map((fieldName) => JSON.stringify(row[fieldName], replacer))
            .join(',')
        );
        csv.unshift(header.join(','));
        const csvArray = csv.join('\r\n');

        const blob = new Blob([csvArray], { type: 'text/csv' });
        saveAs(blob, 'myFile.csv');
      }
      this.updateActionsStatus('download', false);
    });
  }

  /**
   * Select All Contacts
   */
  selectAll(source = false): void {
    for (const contact of this.pageContacts) {
      if (!this.isSelected(contact)) {
        this.pageSelection.push(new Contact().deserialize(contact));
        this.selection.push(new Contact().deserialize(contact));
      }
    }
    this.updateActionsStatus('select', false);
    this.updateSelectActionStatus(false);
  }

  deselectAll(): void {
    this.pageSelection = [];
    this.selection = [];
    this.updateSelectActionStatus(true);
  }

  /**
   * Delete Selected Contacts
   */
  deleteConfirm(): void {
    this.dialog
      .open(ConfirmComponent, {
        ...DialogSettings.CONFIRM,
        data: {
          title: 'Delete contacts',
          message: 'Are you sure to delete contacts?',
          confirmLabel: 'Delete'
        }
      })
      .afterClosed()
      .subscribe((res) => {
        if (res) {
          this.delete();
          this.handlerService.reload$();
        }
      });
  }

  delete(): void {
    const ids = [];
    this.selection.forEach((e) => {
      ids.push(e._id);
    });
    this.updateActionsStatus('delete', true);
    this.contactService.bulkDelete(ids).subscribe((status) => {
      this.updateActionsStatus('delete', false);
      if (!status) {
        return;
      }
      if (this.searchStr || !this.searchOption.isEmpty()) {
        // Searched Contacts
        const selection = [...this.selection];
        this.selection = [];
        this.pageSelection = [];
        this.contactService.delete$([...selection]);
      } else {
        // Pages Contacts
        const selection = [...this.selection];
        this.selection = [];
        this.pageSelection = [];
        const { total, page } = this.contactService.delete$([...selection]);
        if (page) {
          return;
        }
        const maxPage =
          total % this.pageSize.id
            ? Math.floor(total / this.pageSize.id) + 1
            : total / this.pageSize.id;
        if (maxPage >= this.page) {
          this.changePage(this.page);
        }
      }
    });
  }

  /**
   * Bulk Edit Open
   */
  bulkEdit(): void {
    this.panelType = 'editor';
    this.drawer.open();
  }

  openMessageDlg(): void {
    this.dialog.open(SendEmailComponent, {
      position: {
        bottom: '0px',
        right: '0px'
      },
      width: '100vw',
      panelClass: 'send-email',
      backdropClass: 'cdk-send-email',
      disableClose: false,
      data: {
        contacts: this.selection
      }
    });
  }

  openNoteDlg(): void {
    this.dialog.open(NoteCreateComponent, {
      ...DialogSettings.NOTE,
      data: {
        contacts: this.selection
      }
    });
  }

  openTaskDlg(): void {
    this.dialog.open(TaskCreateComponent, {
      ...DialogSettings.TASK,
      data: {
        contacts: this.selection
      }
    });
  }

  openAutomationDlg(): void {
    if (this.selection.length <= 10) {
      this.dialog.open(ContactAssignAutomationComponent, {
        ...DialogSettings.AUTOMATION,
        data: {
          contacts: this.selection
        }
      });
    } else {
      this.dialog.open(NotifyComponent, {
        width: '98vw',
        maxWidth: '390px',
        data: {
          title: 'Add Automation',
          message: 'You can assign to at most 10 contacts.'
        }
      });
    }
  }

  /**
   * Handler when page number get out of the bound after remove contacts.
   * @param $event : Page Number
   */
  pageChanged($event: number): void {
    this.changePage($event);
  }

  /**
   * Panel Open and Close event
   * @param $event Panel Open Status
   */
  setPanelType($event: boolean): void {
    if (!$event) {
      this.panelType = '';
    } else {
      this.editPanel.clearForm();
    }
  }

  avatarName(contact): string {
    if (contact.first_name && contact.last_name) {
      return contact.first_name[0] + contact.last_name[0];
    } else if (contact.first_name) {
      return contact.first_name.substring(0, 2);
    } else if (contact.last_name) {
      return contact.last_name.substring(0, 2);
    } else {
      return 'UN';
    }
  }

  // Reset the Selection without current Contact page to fix when merge
  // this.selection = _.differenceBy(this.selection, this.pageContacts, '_id');
  // Merge the All Selection with page Selection
  // this.selection = _.unionBy(this.selection, this.pageSelection, '_id');
}