import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { Contact } from 'src/app/models/contact.model';
import { Template } from 'src/app/models/template.model';
import { MaterialService } from 'src/app/services/material.service';
import { TemplatesService } from 'src/app/services/templates.service';
import { UserService } from 'src/app/services/user.service';
import { environment } from 'src/environments/environment';
import { MaterialBrowserComponent } from '../material-browser/material-browser.component';

@Component({
  selector: 'app-send-text',
  templateUrl: './send-text.component.html',
  styleUrls: ['./send-text.component.scss']
})
export class SendTextComponent implements OnInit, OnDestroy {
  contact: Contact;
  message: string = '';
  conversation: any;
  userId: string = '';

  loading = false;
  loadSubscription: Subscription;
  sending = false;
  sendSubscription: Subscription;
  constructor(
    private dialogRef: MatDialogRef<SendTextComponent>,
    private dialog: MatDialog,
    public templateService: TemplatesService,
    private materialService: MaterialService,
    public userService: UserService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    if (this.data && this.data.contact) {
      this.contact = new Contact().deserialize(this.data.contact);
    }
    this.userId = this.userService.profile.getValue()._id;
    this.templateService.loadAll(false);
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {}

  openMaterialsDlg(): void {
    const { videoIds, imageIds, pdfIds } = this.getMaterials();
    const selectedMaterials = [...videoIds, ...imageIds, ...pdfIds].map((e) => {
      return { _id: e };
    });
    this.dialog
      .open(MaterialBrowserComponent, {
        width: '98vw',
        maxWidth: '940px',
        data: {
          multiple: true,
          hideMaterials: selectedMaterials
        }
      })
      .afterClosed()
      .subscribe((res) => {
        if (res && res.materials && res.materials.length) {
          res.materials.forEach((e, index) => {
            let url;
            switch (e.material_type) {
              case 'video':
                url = `${environment.website}/video?video=${e._id}&user=${this.userId}`;
                break;
              case 'pdf':
                url = `${environment.website}/pdf?pdf=${e._id}&user=${this.userId}`;
                break;
              case 'image':
                url = `${environment.website}/image?image=${e._id}&user=${this.userId}`;
                break;
            }
            // first element insert
            if (
              index === 0 &&
              (!this.message || this.message.slice(-1) === '\n')
            ) {
              this.message += url;
              return;
            }
            // middle element insert
            this.message = this.message + '\n' + url;
          });
        }
      });
  }

  getMaterials(): any {
    const videoIds = [];
    const pdfIds = [];
    const imageIds = [];

    const videoReg = new RegExp(
      environment.website + '/video[?]video=\\w+&user=' + this.userId,
      'g'
    );
    const pdfReg = new RegExp(
      environment.website + '/pdf[?]pdf=\\w+&user=' + this.userId,
      'g'
    );
    const imageReg = new RegExp(
      environment.website + '/image[?]image=\\w+&user=' + this.userId,
      'g'
    );

    let matches = this.message.match(videoReg);
    if (matches && matches.length) {
      matches.forEach((e) => {
        const videoId = e
          .replace(environment.website + '/video?video=', '')
          .replace('&user=' + this.userId, '');
        videoIds.push(videoId);
      });
    }
    matches = this.message.match(pdfReg);
    if (matches && matches.length) {
      matches.forEach((e) => {
        const pdfId = e
          .replace(environment.website + '/pdf?pdf=', '')
          .replace('&user=' + this.userId, '');
        pdfIds.push(pdfId);
      });
    }
    matches = this.message.match(imageReg);
    if (matches && matches.length) {
      matches.forEach((e) => {
        const imageId = e
          .replace(environment.website + '/image?image=', '')
          .replace('&user=' + this.userId, '');
        imageIds.push(imageId);
      });
    }

    return {
      videoIds,
      imageIds,
      pdfIds
    };
  }

  send(): void {
    if (this.message === '' || this.message.replace(/\s/g, '').length == 0) {
      return;
    }
    const { videoIds, imageIds, pdfIds } = this.getMaterials();

    this.sending = true;
    this.sendSubscription && this.sendSubscription.unsubscribe();
    this.sendSubscription = this.materialService
      .sendMessage({
        video_ids: videoIds,
        pdf_ids: pdfIds,
        image_ids: imageIds,
        content: this.message,
        contacts: [this.contact._id],
        mode: 'api'
      })
      .subscribe((res) => {
        this.sending = false;
        console.log('send result', res);
      });
  }

  selectTemplate(template: Template): void {
    this.message = template.content;
  }

  keyTrigger(event): void {
    if (event.key === 'Enter') {
      if (event.ctrlKey || event.altKey) {
        return;
      }
      if (!event.shiftKey) {
        event.preventDefault();
        this.send();
      }
    }
  }
}