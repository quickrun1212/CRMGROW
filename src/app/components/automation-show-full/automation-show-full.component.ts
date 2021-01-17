import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ACTION_CAT } from 'src/app/constants/variable.constants';
import { DagreNodesOnlyLayout } from '../../variables/customDagreNodesOnly';
import { stepRound } from '../../variables/customStepCurved';
import { AutomationService } from 'src/app/services/automation.service';
import { OverlayService } from 'src/app/services/overlay.service';
import { PageCanDeactivate } from 'src/app/variables/abstractors';
import { Subject } from 'rxjs';
import { Layout } from '@swimlane/ngx-graph';

@Component({
  selector: 'app-automation-show-full',
  templateUrl: './automation-show-full.component.html',
  styleUrls: ['./automation-show-full.component.scss']
})
export class AutomationShowFullComponent
  extends PageCanDeactivate
  implements OnInit, OnDestroy, AfterViewInit {
  layoutSettings = {
    orientation: 'TB'
  };
  center$: Subject<boolean> = new Subject();
  curve = stepRound;
  public layout: Layout = new DagreNodesOnlyLayout();
  initEdges = [];
  initNodes = [{ id: 'start', label: '' }];
  edges = [];
  nodes = [];
  automation;
  saved = true;
  identity = 1;
  autoZoom = false;
  zoomLevel = 1;

  @ViewChild('wrapper') wrapper: ElementRef;
  wrapperWidth = 0;
  wrapperHeight = 0;
  offsetX = 0;
  offsetY = 0;

  constructor(
    private dialogRef: MatDialogRef<AutomationShowFullComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private automationService: AutomationService,
    private overlayService: OverlayService,
    private viewContainerRef: ViewContainerRef
  ) {
    super();
  }

  ngOnInit(): void {
    const id = this.data.id;
    this.loadData(id);
    window['confirmReload'] = true;
  }

  ngOnDestroy(): void {
    // this.storeData();
    window['confirmReload'] = false;
  }

  ngAfterViewInit(): void {
    this.onResize(null);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event): void {
    this.wrapperWidth = this.wrapper.nativeElement.offsetWidth;
  }

  loadData(id: string): void {
    this.automationService.get(id).subscribe(
      (res) => {
        this.automation = res;
        console.log('$$$', this.automation);
        const actions = res['automations'];
        actions.forEach((action) => {
          this.data.automations.forEach((automation) => {
            if (action.id == automation.ref) {
              action.status = automation.status;
            }
          });
        });
        this.composeGraph(actions);
      },
      (err) => {}
    );
  }

  composeGraph(actions: any): void {
    let maxId = 0;
    const ids = [];
    let missedIds = [];
    const currentIds = [];
    const nodes = [];
    const edges = [];
    const caseNodes = {}; // Case nodes pair : Parent -> Sub case actions
    const edgesBranches = []; // Edge Branches
    if (actions) {
      actions.forEach((e) => {
        const idStr = (e.id + '').replace('a_', '');
        const id = parseInt(idStr);
        if (maxId < id) {
          maxId = id;
        }
        currentIds.push(id);
      });
    }
    for (let i = 1; i <= maxId; i++) {
      ids.push(i);
    }
    missedIds = ids.filter(function (n) {
      return currentIds.indexOf(n) === -1;
    });

    if (actions) {
      actions.forEach((e) => {
        if (e.condition) {
          const node = {
            id: e.id,
            index: this.genIndex(e.id),
            period: e.period
          };
          if (e.action) {
            node['type'] = e.action.type;
            node['content'] = e.action.content;
            node['subject'] = e.action.subject;
            node['due_date'] = e.action.due_date;
            node['due_duration'] = e.action.due_duration;
            node['video'] = e.action.video;
            node['pdf'] = e.action.pdf;
            node['image'] = e.action.image;
            node['label'] = this.ACTIONS[e.action.type];
            node['category'] = ACTION_CAT.NORMAL;
            node['command'] = e.action.command;
            node['ref_id'] = e.action.ref_id;
            node['status'] = e.status;
          }
          nodes.push(node);
          let conditionType;
          if (e.watched_video) {
            conditionType = 'watched_video';
          } else if (e.watched_pdf) {
            conditionType = 'watched_pdf';
          } else if (e.watched_image) {
            conditionType = 'watched_image';
          } else {
            conditionType = 'opened_email';
          }
          if (e.condition.answer) {
            const yesNodeIndex = missedIds.splice(-1)[0];
            const yesNodeId = 'a_' + yesNodeIndex;
            const yesNode = {
              id: yesNodeId,
              index: yesNodeIndex,
              label: 'YES',
              leaf: false,
              category: ACTION_CAT.CONDITION,
              condition: { case: conditionType, answer: true }
            };
            nodes.push(yesNode);
            const bSource = e.parent;
            const bTarget = yesNodeId;
            const target = e.id;
            edges.push({
              id: bSource + '_' + bTarget,
              source: bSource,
              target: bTarget,
              category: 'case',
              answer: 'yes',
              status: e.status
            });
            edges.push({
              id: bTarget + '_' + target,
              source: bTarget,
              target: target,
              status: e.status
            });
            edgesBranches.push(bSource);
            edgesBranches.push(bTarget);
            if (caseNodes[bSource]) {
              caseNodes[bSource].push(yesNode);
            } else {
              caseNodes[bSource] = [yesNode];
            }
          }
          if (!e.condition.answer) {
            const noNodeIndex = missedIds.splice(-1)[0];
            const noNodeId = 'a_' + noNodeIndex;
            const noNode = {
              id: noNodeId,
              index: noNodeIndex,
              label: 'NO',
              leaf: false,
              category: ACTION_CAT.CONDITION,
              condition: { case: conditionType, answer: false }
            };
            nodes.push(noNode);
            const bSource = e.parent;
            const bTarget = noNodeId;
            const target = e.id;
            edges.push({
              id: bSource + '_' + bTarget,
              source: bSource,
              target: bTarget,
              category: 'case',
              answer: 'no',
              hasLabel: true,
              type: conditionType,
              status: e.status
            });
            edges.push({
              id: bTarget + '_' + target,
              source: bTarget,
              target: target,
              status: e.status
            });
            edgesBranches.push(bSource);
            edgesBranches.push(bTarget);
            if (caseNodes[bSource]) {
              caseNodes[bSource].push(noNode);
            } else {
              caseNodes[bSource] = [noNode];
            }
          }
        } else {
          const node = {
            id: e.id,
            index: this.genIndex(e.id),
            period: e.period
          };
          if (e.action) {
            node['type'] = e.action.type;
            node['content'] = e.action.content;
            node['subject'] = e.action.subject;
            node['due_date'] = e.action.due_date;
            node['due_duration'] = e.action.due_duration;
            node['video'] = e.action.video;
            node['pdf'] = e.action.pdf;
            node['image'] = e.action.image;
            node['label'] = this.ACTIONS[e.action.type];
            node['category'] = ACTION_CAT.NORMAL;
            node['command'] = e.action.command;
            node['ref_id'] = e.action.ref_id;
            node['status'] = e.status;
          }
          nodes.push(node);
          if (e.parent !== '0') {
            const source = e.parent;
            const target = e.id;
            edges.push({
              id: source + '_' + target,
              source,
              target,
              status: e.status
            });
            edgesBranches.push(source);
          }
        }
      });
    }

    // Uncompleted Case Branch Make
    for (const branch in caseNodes) {
      if (caseNodes[branch].length === 1) {
        let newNodeIndex = missedIds.splice(-1)[0];
        if (!newNodeIndex) {
          newNodeIndex = maxId;
          maxId++;
        }
        const newNodeId = 'a_' + newNodeIndex;
        const conditionType = caseNodes[branch][0].condition.case;
        if (caseNodes[branch][0].condition.answer) {
          // Insert False case
          const noNode = {
            id: newNodeId,
            index: newNodeIndex,
            label: 'NO',
            leaf: true,
            condition: { case: conditionType, answer: false },
            category: ACTION_CAT.CONDITION
          };
          nodes.push(noNode);
          const bSource = branch;
          const bTarget = newNodeId;
          edges.push({
            id: bSource + '_' + bTarget,
            source: bSource,
            target: bTarget,
            category: 'case',
            answer: 'no',
            hasLabel: true,
            type: conditionType
          });
        } else {
          // Insert true case
          const yesNode = {
            id: newNodeId,
            index: newNodeIndex,
            label: 'YES',
            leaf: false,
            condition: { case: conditionType, answer: true },
            category: ACTION_CAT.CONDITION
          };
          nodes.push(yesNode);
          const bSource = branch;
          const bTarget = newNodeId;
          edges.push({
            id: bSource + '_' + bTarget,
            source: bSource,
            target: bTarget,
            category: 'case',
            answer: 'yes'
          });
        }
      }
    }
    // Leaf Setting
    nodes.forEach((e) => {
      if (edgesBranches.indexOf(e.id) !== -1) {
        e.leaf = false;
      } else {
        e.leaf = true;
      }
    });
    this.identity = maxId;
    this.nodes = [...nodes];
    this.edges = [...edges];
    console.log('!@#', this.edges);
  }

  genIndex(id: string): any {
    const idStr = (id + '').replace('a_', '');
    return parseInt(idStr);
  }

  easyView(node: any, origin: any, content: any): void {
    this.overlayService.open(
      origin,
      content,
      this.viewContainerRef,
      'automation',
      {
        data: node
      }
    );
  }

  zoomIn(): void {
    if (this.zoomLevel < 3) {
      this.autoZoom = false;
      this.zoomLevel++;
    }
  }

  zoomOut(): void {
    if (this.zoomLevel > 0) {
      this.zoomLevel--;
      if (this.zoomLevel === 0) {
        this.autoZoom = true;
      }
    }
  }

  ICONS = {
    follow_up: '../../assets/img/automations/follow_up.svg',
    update_follow_up:
      'https://app.crmgrow.com/assets/img/icons/follow-step.png',
    note: '../../assets/img/automations/create_note.svg',
    email: '../../assets/img/automations/send_email.svg',
    send_email_video: '../../assets/img/automations/send_video_email.svg',
    send_text_video: '../../assets/img/automations/send_video_text.svg',
    send_email_pdf: '../../assets/img/automations/send_pdf_email.svg',
    send_text_pdf: '../../assets/img/automations/send_pdf_text.svg',
    send_email_image: '../../assets/img/automations/send_image_email.svg',
    send_text_image: 'https://app.crmgrow.com/assets/img/icons/image_sms.png',
    update_contact:
      'https://app.crmgrow.com/assets/img/icons/update_contact.png'
  };
  ACTIONS = {
    follow_up: 'Follow up',
    update_follow_up: 'Update Follow up',
    note: 'Create Note',
    email: 'Send E-mail',
    send_email_video: 'Send Video E-mail',
    send_text_video: 'Send Video Text',
    send_email_pdf: 'Send PDF E-mail',
    send_text_pdf: 'Send PDF Text',
    send_email_image: 'Send Image E-mail',
    send_text_image: 'Send Image Text',
    update_contact: 'Update Contact'
  };
  CASE_ACTIONS = {
    watched_video: 'Watched Video?',
    watched_pdf: 'Reviewed PDF?',
    watched_image: 'Reviewed Image?',
    opened_email: 'Opened Email?'
  };
  NEED_CASE_ACTIONS: [
    'email',
    'send_email_video',
    'send_text_video',
    'send_email_pdf',
    'send_text_pdf',
    'send_email_image',
    'send_text_image'
  ];
}
