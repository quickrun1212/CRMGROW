import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { SlideTabComponent } from './slide-tab/slide-tab.component';
import { TabOptionComponent } from './tab-option/tab-option.component';
import { ActionsBarComponent } from './actions-bar/actions-bar.component';
import { AvatarEditorComponent } from './avatar-editor/avatar-editor.component';
import { NgxCropperJsModule } from 'ngx-cropperjs-wrapper';
import { SharedModule } from '../layouts/shared/shared.module';
import { VideoCreateComponent } from './video-create/video-create.component';
import { ConfirmComponent } from './confirm/confirm.component';
import { TeamEditComponent } from './team-edit/team-edit.component';
import { TeamDeleteComponent } from './team-delete/team-delete.component';
import { VideoShareComponent } from './video-share/video-share.component';
import { InputContactsComponent } from './input-contacts/input-contacts.component';
import { SelectContactComponent } from './select-contact/select-contact.component';
import { InputAutomationComponent } from './input-automation/input-automation.component';
import { InputTemplateComponent } from './input-template/input-template.component';
import { InputTeamComponent } from './input-team/input-team.component';
import { SelectUserComponent } from './select-user/select-user.component';
import { SelectLeaderComponent } from './select-leader/select-leader.component';
import { CalendarDialogComponent } from './calendar-dialog/calendar-dialog.component';
import { CalendarContactsComponent } from './calendar-contacts/calendar-contacts.component';
import { CalendarEventComponent } from './calendar-event/calendar-event.component';
import { CalendarRecurringDialogComponent } from './calendar-recurring-dialog/calendar-recurring-dialog.component';
@NgModule({
  declarations: [
    SlideTabComponent,
    TabOptionComponent,
    ActionsBarComponent,
    AvatarEditorComponent,
    ConfirmComponent,
    TeamEditComponent,
    TeamDeleteComponent,
    VideoShareComponent,
    InputContactsComponent,
    SelectContactComponent,
    InputAutomationComponent,
    InputTemplateComponent,
    InputTeamComponent,
    SelectUserComponent,
    VideoCreateComponent,
    ConfirmComponent,
    SelectLeaderComponent,
    CalendarDialogComponent,
    CalendarContactsComponent,
    CalendarEventComponent,
    CalendarRecurringDialogComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    TranslateModule.forChild({ extend: true }),
    NgxCropperJsModule
  ],
  exports: [
    SlideTabComponent,
    TabOptionComponent,
    ConfirmComponent,
    TeamEditComponent,
    TeamDeleteComponent,
    InputContactsComponent,
    SelectContactComponent,
    InputTemplateComponent,
    InputAutomationComponent,
    InputTeamComponent,
    SelectUserComponent,
    SelectLeaderComponent,
    CalendarDialogComponent
  ],
  bootstrap: [AvatarEditorComponent, VideoShareComponent]
})
export class ComponentsModule {}
