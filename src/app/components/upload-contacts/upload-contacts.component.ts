import { Component, OnInit, ViewChild } from '@angular/core';
import { environment } from 'src/environments/environment';
import { FileUploader } from 'ng2-file-upload';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { Papa } from 'ngx-papaparse';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import * as d3 from 'd3-collection';
import { SelectionModel } from '@angular/cdk/collections';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-upload-contacts',
  templateUrl: './upload-contacts.component.html',
  styleUrls: ['./upload-contacts.component.scss']
})
export class UploadContactsComponent implements OnInit {
  @ViewChild('file') file: any;
  public uploader: FileUploader = new FileUploader({
    url: environment.api + 'contact/import-csv',
    authToken: this.userService.getToken(),
    itemAlias: 'csv'
  });
  public overwriter: FileUploader = new FileUploader({
    url: environment.api + 'contact/overwrite-csv',
    authToken: this.userService.getToken(),
    itemAlias: 'csv'
  });
  public headers = [];
  public uploadHeaders = [];
  public newHeaders = [];
  public lines = [];
  private dataText = '';
  private failedData = [];
  public failedRecords = [];

  columns = [];
  selectedColumn;
  selectedColumnIndex;

  updateColumn = {};

  step = 1;

  confirm1 = false;
  confirm2 = false;
  submitted = false;

  importError = false;
  uploading = false;

  contacts = []; // Contacts is loaded from file directly
  contactsToUpload = []; // Contacts to upload

  groupRecordsByEmail = {};
  groupRecordsByPhone = {};

  sameEmails = [];
  samePhones = [];

  previewEmails = []; // Emails to merge contacts
  previewPhones = []; // Phones to merge contacts
  selectedContacts = new SelectionModel<any>(true, []);
  overwriteContacts = new SelectionModel(true, []); // Contacts to overwrite
  overwriting = false;

  constructor(
    private dialogRef: MatDialogRef<UploadContactsComponent>,
    private userService: UserService,
    private dialog: MatDialog,
    private papa: Papa
  ) {}

  ngOnInit(): void {
    this.uploader.onAfterAddingFile = (file) => {
      file.withCredentials = false;
      if (this.uploader.queue.length > 1) {
        this.uploader.queue.splice(0, 1);
      }
    };
    this.uploader.onCompleteItem = (
      item: any,
      response: any,
      status: any,
      headers: any
    ) => {
      response = JSON.parse(response);
      this.uploading = false;
      if (response.status) {
        this.failedData = response.failure;
        this.failedRecords = [];
        const emails = [];
        this.failedData.forEach((e) => {
          emails.push(e.email);
        });
        this.contactsToUpload.forEach((e) => {
          if (emails.indexOf(e.email) !== -1) {
            this.failedRecords.push({ ...e });
          }
        });
        if (!this.failedData.length) {
          this.dialogRef.close({ status: true });
        } else {
          this.step = 5;
        }
      } else {
        this.uploading = false;
        this.file.nativeElement.value = '';
      }
    };
    this.overwriter.onAfterAddingFile = (file) => {
      file.withCredentials = false;
      if (this.overwriter.queue.length > 1) {
        this.overwriter.queue.splice(0, 1);
      }
    };
    this.overwriter.onCompleteItem = (
      item: any,
      response: any,
      status: any,
      headers: any
    ) => {
      response = JSON.parse(response);
      this.overwriting = false;
      if (response.status) {
        this.dialogRef.close({ status: true });
      } else {
        this.overwriting = false;
        this.file.nativeElement.value = '';
        // Overwriting Error Display
      }
    };
  }

  openFileDialog(): void {
    this.file.nativeElement.click();
  }

  readFile(evt): any {
    const file = evt.target.files[0];
    if (!file) {
      return false;
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      // this.dialog.open(NotifyComponent, {
      //   width: '300px',
      //   data: {
      //     message: 'Please select the CSV file.'
      //   }
      // });
      // return false;
    }
    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      const text = fileReader.result + '';
      this.papa.parse(text, {
        skipEmptyLines: true,
        complete: (results, file) => {
          this.columns = results.data[0];
          this.lines = results.data.slice(1);
          this.dataText = this.papa.unparse(this.lines);

          const sameColumns = {};
          for (let i = 0; i < this.columns.length; i++) {
            let column = this.columns[i];
            column = column.replace(/(\s\(\d\))$/, '');
            if (!sameColumns[column]) {
              sameColumns[column] = 1;
            } else {
              this.columns[i] = column + ' (' + sameColumns[column] + ')';
              sameColumns[column]++;
            }
          }

          this.selectedColumn = this.columns[0];
          this.selectedColumnIndex = 0;

          this.step = 2;
        }
      });
    };
    fileReader.readAsText(evt.target.files[0]);
  }

  nextStep(): void {
    this.step++;
  }

  prevStep(): void {
    this.step--;
    if (this.step === 2) {
      this.importError = false;
    }
  }

  selectColumn(column): void {
    this.selectedColumn = column;
    this.selectedColumnIndex = this.columns.indexOf(column);
  }

  review(): void {
    this.contacts = [];
    this.contactsToUpload = [];
    this.sameEmails = [];
    this.samePhones = [];
    this.groupRecordsByEmail = {};
    this.groupRecordsByPhone = {};
    this.previewEmails = [];
    this.previewPhones = [];
    let importField = false;
    this.columns.some((e) => {
      if (this.updateColumn[e]) {
        importField = true;
        return true;
      }
    });
    if (importField) {
      this.lines.map((record) => {
        const contact = {};
        record.map((e, index) => {
          const originColumn = this.columns[index];
          const newColumn = this.updateColumn[originColumn];
          if (newColumn) {
            contact[newColumn] = e;
          }
        });
        this.contacts.push({ ...contact, id: this.contacts.length });
      });
      const dupTest = this.checkDuplicate();
      console.log("duplicate email ================>", dupTest, this.sameEmails);
      if (dupTest) {
        this.step = 3;
      } else {
        this.step = 4;
        this.contactsToUpload = this.contacts;
      }
    } else {
      this.importError = true;
    }
  }

  checkDuplicate(): any {
    let emailKey = '';
    let phoneKey = '';
    for (const key in this.updateColumn) {
      if (this.updateColumn[key] === 'email') {
        emailKey = key;
      }
      if (this.updateColumn[key] === 'phone') {
        phoneKey = key;
      }
    }
    if (emailKey) {
      const groupsByEmail = d3
        .nest()
        .key(function(d) {
          return d.email;
        })
        .entries(this.contacts);

      groupsByEmail.forEach((e) => {
        if (e.values.length > 1 && e.key && e.key !== 'undefined') {
          e.secondaries = [];
          e.primary = e.values[0].id;
          this.sameEmails.push(e);
          e.values.forEach((val) => {
            e.secondaries.push(val.id);
          });
        } else if (e.values.length === 1) {
          this.contactsToUpload.push(e.values[0]);
        }
      });
    }
    if (phoneKey) {
      const groupsByPhone = d3
        .nest()
        .key(function(d) {
          return d.phone;
        })
        .entries(this.contacts);
      groupsByPhone.forEach((e) => {
        if (e.values.length > 1 && e.key && e.key !== 'undefined') {
          e.secondaries = [];
          e.primary = e.values[0].id;
          this.samePhones.push(e);
        }
      });
    }
    // console.log('this.sameEmails', this.sameEmails, this.samePhones);
    if (this.sameEmails.length) {
      return true;
    } else {
      return false;
    }
  }

  toggleSecContact(dupItem, contact): void {
    const pos = dupItem.secondaries.indexOf(contact.id);
    if (pos !== -1) {
      dupItem.secondaries.splice(pos, 1);
    } else {
      dupItem.secondaries.push(contact.id);
    }
  }

  keepSeparated(dupItem): void {
    this.contactsToUpload = this.contactsToUpload.concat(dupItem.values);
    this.sameEmails.some((e, index) => {
      if (e.key === dupItem.key) {
        this.sameEmails.splice(index, 1);
        return true;
      }
    });
    if (!this.sameEmails.length) {
      this.goToReview();
    }
  }

  mergePreview(dupItem): void {
    let result = {};
    let primary = {};
    const unmerged = [];
    dupItem.values.forEach((e) => {
      if (e.id === dupItem.primary) {
        primary = { ...e };
        return;
      }
      if (dupItem.secondaries.indexOf(e.id) !== -1) {
        const el = { ...e };
        for (const key in e) {
          if (key !== 'id' && !el[key]) {
            delete el[key];
          }
        }
        result = { ...result, ...el };
        return;
      }
      unmerged.push(e);
    });
    for (const key in primary) {
      if (key !== 'id' && !primary[key]) {
        delete primary[key];
      }
    }
    result = { ...result, ...primary };
    dupItem.previews = [result, ...unmerged];
    this.previewEmails.push(dupItem.key);
  }

  cancelPreview(dupItem): void {
    dupItem.previews = [];
    const pos = this.previewEmails.indexOf(dupItem.key);
    if (pos !== -1) {
      this.previewEmails.splice(pos, 1);
    }
  }

  mergeConfirm(dupItem): void {
    dupItem.values = [...dupItem.previews];
    dupItem.previews = [];
    dupItem.secondaries = [];
    dupItem.values.forEach((e) => {
      dupItem.secondaries.push(e.id);
    });
    const pos = this.previewEmails.indexOf(dupItem.key);
    if (pos !== -1) {
      this.previewEmails.splice(pos, 1);
    }
  }

  goToReview(): void {
    this.sameEmails.forEach((e) => {
      this.contactsToUpload = this.contactsToUpload.concat(e.values);
    });
    this.step = 4;
  }

  goToMatch(): void {
    this.step = 2;
  }

  upload(): void {
    this.dialogRef.close({ data: this.contactsToUpload });
    // const headers = [];
    // const lines = [];
    // for (const key in this.updateColumn) {
    //   if (this.updateColumn[key]) {
    //     headers.push(this.updateColumn[key]);
    //   }
    // }
    // this.contactsToUpload.forEach((contact) => {
    //   const record = [];
    //   for (let i = 0; i < headers.length; i++) {
    //     const key = headers[i];
    //     if (key === 'phone') {
    //       let cell_phone = contact['phone'];
    //       if (cell_phone) {
    //         if (cell_phone[0] === '+') {
    //           cell_phone = cell_phone.replace(/\D/g, '');
    //           cell_phone = '+' + cell_phone;
    //         } else {
    //           cell_phone = cell_phone.replace(/\D/g, '');
    //           cell_phone = '+1' + cell_phone;
    //         }
    //       }
    //       record.push(cell_phone || '');
    //     } else {
    //       record.push(contact[key] || '');
    //     }
    //   }
    //   lines.push(record);
    // });
    // lines.unshift(headers);
    // this.dataText = this.papa.unparse(lines);
    // this.uploadCSV();
  }

  uploadCSV(): void {
    let file;
    try {
      file = new File([this.dataText], 'upload.csv');
    } catch {
      const blob = new Blob([this.dataText]);
      Object.assign(blob, {});
      file = blob as File;
    }
    this.uploader.addToQueue([file]);
    this.uploader.queue[0].withCredentials = false;
    this.uploader.uploadAll();
    this.uploading = true;
  }

  toggleAllFailedRecords(): void {
    if (this.failedRecords.length !== this.overwriteContacts.selected.length) {
      this.failedRecords.forEach((e) => {
        if (!this.overwriteContacts.isSelected(e)) {
          this.overwriteContacts.select(e);
        }
      });
    } else {
      this.overwriteContacts.clear();
    }
  }

  toggleFailedRecord(contact): void {
    this.overwriteContacts.toggle(contact);
  }

  overwrite(): void {
    const headers = [];
    const lines = [];
    for (const key in this.updateColumn) {
      if (this.updateColumn[key]) {
        headers.push(this.updateColumn[key]);
      }
    }
    this.overwriteContacts.selected.forEach((contact) => {
      const record = [];
      for (let i = 0; i < headers.length; i++) {
        const key = headers[i];
        if (key === 'phone') {
          let cell_phone = contact['phone'];
          if (cell_phone) {
            if (cell_phone[0] === '+') {
              cell_phone = cell_phone.replace(/\D/g, '');
              cell_phone = '+' + cell_phone;
            } else {
              cell_phone = cell_phone.replace(/\D/g, '');
              cell_phone = '+1' + cell_phone;
            }
          }
          record.push(cell_phone || '');
        } else {
          record.push(contact[key] || '');
        }
      }
      lines.push(record);
    });
    lines.unshift(headers);
    const dataText = this.papa.unparse(lines);
    let file;
    try {
      file = new File([dataText], 'upload.csv');
    } catch {
      const blob = new Blob([dataText]);
      Object.assign(blob, {});
      file = blob as File;
    }
    this.overwriter.addToQueue([file]);
    this.overwriter.queue[0].withCredentials = false;
    this.overwriter.uploadAll();
    this.overwriting = true;
  }

  close(): void {
    this.dialogRef.close();
  }

  selectAllContacts(): void {
    if (this.isSelectedContacts()) {
      this.contactsToUpload.forEach((e) => {
        this.selectedContacts.deselect(e.id);
      });
    } else {
      this.contactsToUpload.forEach((e) => {
        this.selectedContacts.select(e.id);
      });
    }
  }
  isSelectedContacts(): any {
    if (this.contactsToUpload.length) {
      for (let i = 0; i < this.contactsToUpload.length; i++) {
        const e = this.contactsToUpload[i];
        if (!this.selectedContacts.isSelected(e.id)) {
          return false;
        }
      }
    } else {
      return false;
    }
    return true;
  }
  fields = [
    {
      value: 'first_name',
      label: 'First Name'
    },
    {
      value: 'last_name',
      label: 'Last Name'
    },
    {
      value: 'email',
      label: 'Email'
    },
    {
      value: 'phone',
      label: 'Phone'
    },
    {
      value: 'brokerage',
      label: 'Current Brokerage'
    },
    {
      value: 'recruiting_stage',
      label: 'Recruiting Stage'
    },
    {
      value: 'address',
      label: 'Address'
    },
    {
      value: 'country',
      label: 'Country'
    },
    {
      value: 'state',
      label: 'State'
    },
    {
      value: 'city',
      label: 'City'
    },
    {
      value: 'zip',
      label: 'Zipcode'
    },
    {
      value: 'note',
      label: 'Notes'
    },
    {
      value: 'tags',
      label: 'Tags'
    },
    {
      value: 'source',
      label: 'Source'
    },
    {
      value: 'label',
      label: 'Label'
    }
  ];

}
