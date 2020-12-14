import { Component, Inject, OnInit } from '@angular/core';
import { Contact } from '../../models/contact.model';
import { SelectionModel } from '@angular/cdk/collections';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef
} from '@angular/material/dialog';
import { ImportSelectableColumn } from '../../constants/variable.constants';
import { ImportContactMergeConfirmComponent } from '../import-contact-merge-confirm/import-contact-merge-confirm.component';

@Component({
  selector: 'app-import-contact-merge',
  templateUrl: './import-contact-merge.component.html',
  styleUrls: ['./import-contact-merge.component.scss']
})
export class ImportContactMergeComponent implements OnInit {
  primaryContact;
  secondaryContact;

  primarySelectionModel = [];
  secondarySelectionModel = [];
  updateColumn;
  columns = [];
  previewColumns = [];

  checkableColumn = [
    'first_name',
    'last_name',
    'address',
    'country',
    'city',
    'state',
    'zip',
    'label',
    'brokerage',
    'source'
  ];
  selectedContact = 'Primary';
  previewContact;

  constructor(
    private dialogRef: MatDialogRef<ImportContactMergeComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadContact();
  }

  loadContact(): void {
    if (this.data) {
      this.primaryContact = this.data.primary;
      this.secondaryContact = this.data.secondary;
      this.previewContact = Object.assign({}, this.primaryContact);

      // load primary columns
      this.updateColumn = this.data.updateColumn;
      for (const name in this.updateColumn) {
        if (this.primaryContact[this.updateColumn[name]] || this.secondaryContact[this.updateColumn[name]]) {
          this.columns.push(this.updateColumn[name]);
          this.previewColumns.push(this.updateColumn[name]);
          if (this.isPrimaryActive()) {
            if (this.primaryContact[this.updateColumn[name]]) {
              this.primarySelectionModel.push(true);
            } else {
              this.primarySelectionModel.push(false);
            }
            this.secondarySelectionModel.push(false);
          } else {
            if (this.secondaryContact[this.updateColumn[name]]) {
              this.secondarySelectionModel.push(true);
            } else {
              this.secondarySelectionModel.push(false);
            }
            this.primarySelectionModel.push(false);
          }
        }
      }
    }
  }

  merge(): void {
    const merged = {
      ...this.previewContact
    };
    this.dialogRef.close({ merged });
  }

  isPrimaryActive(): any {
    if (this.selectedContact === 'Primary') {
      return true;
    }
    return false;
  }

  changeContact($event): void {
    this.primarySelectionModel = [];
    this.secondarySelectionModel = [];

    if (this.isPrimaryActive()) {
      this.selectedContact = 'Secondary';
      for (const name in this.updateColumn) {
        if (this.secondaryContact[this.updateColumn[name]]) {
          this.secondarySelectionModel.push(true);
        } else {
          this.secondarySelectionModel.push(false);
        }
        this.primarySelectionModel.push(false);
      }
    } else {
      this.selectedContact = 'Primary';
      for (const name in this.updateColumn) {
        if (this.primaryContact[this.updateColumn[name]]) {
          this.primarySelectionModel.push(true);
        } else {
          this.primarySelectionModel.push(false);
        }
        this.secondarySelectionModel.push(false);
      }
    }
    this.mergePreview('all');
  }

  changeCheck(row, column): void {
    this.primarySelectionModel[row] = !this.primarySelectionModel[row];
    this.secondarySelectionModel[row] = !this.secondarySelectionModel[row];
    this.mergePreview(column);
  }

  changePrimarySelection(row, column): void {
    this.primarySelectionModel[row] = !this.primarySelectionModel[row];
    this.mergePreview(column);
  }

  changeSecondarySelection(row, column): void {
    this.secondarySelectionModel[row] = !this.secondarySelectionModel[row];
    this.mergePreview(column);
  }

  isCheckable(column): any {
    if (this.checkableColumn.indexOf(column) >= 0) {
      return true;
    }
    return false;
  }

  getAllCheckValues(column): any {
    const result = [];
    const filter = column.includes('email') ? 'email' : 'phone';
    const primaryFilter = 'primary_' + filter;
    const secondaryFilter = 'secondary_' + filter;
    const primaryIndex = this.columns.indexOf(primaryFilter);
    const secondaryIndex = this.columns.indexOf(secondaryFilter);

    if (this.selectedContact === 'Primary') {
      if (this.primarySelectionModel[primaryIndex]) {
        result.push(this.primaryContact[primaryFilter]);
      }
      if (this.secondarySelectionModel[primaryIndex]) {
        if (result.indexOf(this.secondaryContact[primaryFilter]) < 0) {
          result.push(this.secondaryContact[primaryFilter]);
        }
      }
      if (this.primarySelectionModel[secondaryIndex]) {
        if (result.indexOf(this.primaryContact[secondaryFilter]) < 0) {
          result.push(this.primaryContact[secondaryFilter]);
        }
      }
      if (this.secondarySelectionModel[secondaryIndex]) {
        if (result.indexOf(this.secondaryContact[secondaryFilter]) < 0) {
          result.push(this.secondaryContact[secondaryFilter]);
        }
      }
    } else if (this.selectedContact === 'Secondary') {
      if (this.secondarySelectionModel[primaryIndex]) {
        if (result.indexOf(this.secondaryContact[primaryFilter]) < 0) {
          result.push(this.secondaryContact[primaryFilter]);
        }
      }
      if (this.primarySelectionModel[primaryIndex]) {
        if (result.indexOf(this.primaryContact[primaryFilter]) < 0) {
          result.push(this.primaryContact[primaryFilter]);
        }
      }
      if (this.secondarySelectionModel[secondaryIndex]) {
        if (result.indexOf(this.secondaryContact[secondaryFilter]) < 0) {
          result.push(this.secondaryContact[secondaryFilter]);
        }
      }
      if (this.primarySelectionModel[secondaryIndex]) {
        if (result.indexOf(this.primaryContact[secondaryFilter]) < 0) {
          result.push(this.primaryContact[secondaryFilter]);
        }
      }
    }
    return result;
  }

  mergePreview(updatedColumn): void {
    for (let i = 0; i < this.columns.length; i++) {
      const column = this.columns[i];
      if (this.isCheckable(column)) {
        if (this.primarySelectionModel[i]) {
          this.previewContact[column] = this.primaryContact[column];
        } else {
          this.previewContact[column] = this.secondaryContact[column];
        }
      } else {
        if (
          column === 'primary_email' ||
          column === 'primary_phone' ||
          column === 'secondary_email' ||
          column === 'secondary_phone'
        ) {
          const filter = column.includes('email') ? 'email' : 'phone';
          const updatedFilter = updatedColumn.includes('email') ? 'email' : 'phone';
          const primaryFilter = 'primary_' + filter;
          const secondaryFilter = 'secondary_' + filter;
          const checkedValues = this.getAllCheckValues(column);

          // additional
          if (this.isPrimaryActive()) {
            this.previewColumns['additional_data'] = Object.assign({}, this.primaryContact['additional_data']);
          } else {
            this.previewColumns['additional_data'] = Object.assign({}, this.secondaryContact['additional_data']);
          }

          // primary
          if (checkedValues.length) {
            this.previewContact[column] = checkedValues[0];
          } else {
            this.previewContact[column] = '';
          }

          // secondary
          if (checkedValues.length > 1) {
            if (this.previewColumns.indexOf(secondaryFilter) < 0) {
              this.previewColumns.push(secondaryFilter);
            }
            if (checkedValues.length === 2) {
              this.previewContact[secondaryFilter] = checkedValues[1];
            } else {
              const mergeValues = [];
              for (let j = 1; j < checkedValues.length; j++) {
                mergeValues.push(checkedValues[j]);
              }
              if (column === 'primary_email' && updatedFilter === 'email' || column === 'primary_phone' && updatedFilter === 'phone') {
                this.dialog
                  .open(ImportContactMergeConfirmComponent, {
                    data: {
                      values: mergeValues,
                      type: filter
                    }
                  })
                  .afterClosed()
                  .subscribe((res) => {
                    if (res) {

                      this.previewContact[secondaryFilter] = res.selected;

                      // set additional email
                      const idx = mergeValues.indexOf(res.selected);
                      if (idx >= 0) {
                        mergeValues.splice(idx, 1);
                      }

                      const val = [];
                      for (let j = 0; j < mergeValues.length; j++) {
                        val.push(mergeValues[j]);
                      }

                      if (!this.previewContact.additional_data) {
                        this.previewContact.additional_data = {};
                      }
                      if (!this.previewContact.additional_data[filter]) {
                        this.previewContact.additional_data[filter] = [];
                      }

                      this.previewContact.additional_data[filter] = this.previewContact.additional_data[filter].concat(val);
                    }
                  });
              }
            }
          }
        } else {
          if (
            this.primarySelectionModel[i] &&
            this.secondarySelectionModel[i]
          ) {
            const mergeItems = [];
            if (column === 'tags') {
              if (this.secondaryContact[column].length) {
                this.secondaryContact[column].forEach((item, index) => {
                  if (this.primaryContact[column].indexOf(item) >= 0) {
                    mergeItems.splice(index, 1);
                  }
                });
              }
              this.previewContact[column] = this.primaryContact[column].concat(
                mergeItems
              );
            } else if (column === 'note') {
              if (this.isPrimaryActive()) {
                for (let j = 0; j < this.primaryContact[column].length; j++) {
                  mergeItems.push(this.primaryContact[column][j]);
                }
                for (let j = 0; j < this.secondaryContact[column].length; j++) {
                  mergeItems.push(this.secondaryContact[column][j]);
                }
              } else {
                for (let j = 0; j < this.secondaryContact[column].length; j++) {
                  mergeItems.push(this.secondaryContact[column][j]);
                }
                for (let j = 0; j < this.primaryContact[column].length; j++) {
                  mergeItems.push(this.primaryContact[column][j]);
                }
              }
              this.previewContact[column] = mergeItems;
            }
          } else {
            if (this.primarySelectionModel[i]) {
              this.previewContact[column] = this.primaryContact[column];
            } else if (this.secondarySelectionModel[i]) {
              this.previewContact[column] = this.secondaryContact[column];
            } else {
              this.previewContact[column] = [];
            }
          }
        }
      }
    }
  }

  isSelectableColumn(column): any {
    if (ImportSelectableColumn.indexOf(column) < 0) {
      return false;
    }
    return true;
  }

  selectableContent(column, content): any {
    let result = '';
    if (column === 'tags') {
      for (let i = 0; i < content.length; i++) {
        if (i === content.length - 1) {
          result = result + content[i];
        } else {
          result = result + content[i] + '<br/>';
        }
      }
      return result;
    } else if (column === 'note') {
      for (let i = 0; i < content.length; i++) {
        result = result + content[i].title + ': ' + content[i].content + '<br/>';
      }
      return result;
    }
  }
}