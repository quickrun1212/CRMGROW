import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { NoteQuillEditor } from '../../constants/variable.constants';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HtmlEditorComponent } from 'src/app/components/html-editor/html-editor.component';
import { EmailService } from '../../services/email.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-call-request-cancel',
  templateUrl: './call-request-cancel.component.html',
  styleUrls: ['./call-request-cancel.component.scss']
})
export class CallRequestCancelComponent implements OnInit {
  message = '';
  config = NoteQuillEditor;
  quillEditorRef;
  submitted = false;
  title = '';
  plan;
  isSending = false;

  constructor(
    private dialogRef: MatDialogRef<CallRequestCancelComponent>,
    private emailService: EmailService,
    private toastr: ToastrService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  @ViewChild('editor') htmlEditor: HtmlEditorComponent;

  ngOnInit(): void {
    if (this.data) {
      this.plan = this.data.data;
    }
  }

  sendMessage(): void {
    const emails = [];
    this.isSending = true;
    for (const contact of this.plan.contacts) {
      emails.push(contact.email);
    }
    if (this.plan.leader && this.plan.leader.email) {
      emails.push(this.plan.leader.email);
    }

    const data = {
      emails,
      email_subject: this.title,
      email_content: this.message
    };

    this.emailService.sendEmail(data).subscribe((res) => {
      this.isSending = false;
      if (res) {
        if (res.status) {
          this.toastr.success('Email has been successfully sent.');
        } else {
          this.toastr.error(res.error);
        }
        this.dialogRef.close();
      }
    });
  }
}
