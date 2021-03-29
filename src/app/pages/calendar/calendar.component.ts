import {
  Component,
  OnInit,
  ChangeDetectorRef,
  Input,
  ViewContainerRef,
  ViewChild,
  TemplateRef,
  HostListener
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AppointmentService } from 'src/app/services/appointment.service';
import { OverlayService } from 'src/app/services/overlay.service';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { CalendarDialogComponent } from '../../components/calendar-dialog/calendar-dialog.component';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { startOfWeek, endOfWeek } from 'date-fns';
import { UserService } from 'src/app/services/user.service';
import { TabItem } from 'src/app/utils/data.types';
import { Subject, Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import * as moment from 'moment';
import * as _ from 'lodash';
@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {
  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView;
  viewDate: Date = new Date();
  today: Date = new Date();

  @Input() locale = 'en';
  public user: any = {};
  weekStart;
  weekEnd;

  isLoading = true;
  loadSubscription: Subscription;

  anotherLoadSubscriptions: Subscription[] = [];

  tabs: TabItem[] = [
    { icon: '', label: 'DAY', id: 'day' },
    { icon: '', label: 'WEEK', id: 'week' },
    { icon: '', label: 'MONTH', id: 'month' }
  ];
  selectedTab: TabItem = this.tabs[0];
  queryParamSubscription: Subscription;

  events: CalendarEvent[] = [];
  dayEvents: any = {};
  showingEvents: CalendarEvent[] = [];
  supplementEvents = {};
  supplementDays: any[] = [];

  // Event id from router
  eventId: string = '';

  // Calendars
  accounts: any[] = [];
  calendars = {};
  selectedCalendars = [];

  // Overlay Relative
  @ViewChild('detailPortalContent') detailPortalContent: TemplateRef<unknown>;
  @ViewChild('creatPortalContent') creatPortalContent: TemplateRef<unknown>;
  overlayRef: OverlayRef;
  templatePortal: TemplatePortal;
  event: any;
  selectedDate: any;

  isShowCalendarList = false;
  refresh: Subject<any> = new Subject();
  overlayCloseSubscription: Subscription;
  constructor(
    private dialog: MatDialog,
    private appointmentService: AppointmentService,
    private overlayService: OverlayService,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private changeDetectorRef: ChangeDetectorRef,
    private viewContainerRef: ViewContainerRef,
    private toast: ToastrService,
    private overlay: Overlay,
    private _viewContainerRef: ViewContainerRef
  ) {
    this.appointmentService.updateCommand$.subscribe((data) => {
      if (data) {
        if (data.command === 'delete') {
          if (data.data.recurrence_id) {
            const events = this.events.filter((e) => {
              if (e.meta.recurrence_id !== data.data.recurrence_id) {
                return true;
              }
            });
            this.events = events;
          } else {
            this.events.some((e, index) => {
              if (e.meta.event_id === data.data.event_id) {
                this.events.splice(index, 1);
                return true;
              }
            });
          }
          this.filterEvents();
        }
      }
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (this.overlayRef && this.overlayRef.hasAttached()) {
      this.overlayRef.detach();
    }
  }

  ngOnInit(): void {
    this.appointmentService.loadCalendars(true);
    this.appointmentService.calendars$.subscribe((data) => {
      this.accounts = [];
      this.calendars = {};
      this.selectedCalendars = [];
      if (data) {
        data.forEach((account) => {
          const acc = { email: account.email };
          if (account.data) {
            const calendars = [];
            account.data.forEach((e) => {
              calendars.push({ ...e, account: account.email });
              this.selectedCalendars.push(e.id);
              this.calendars[e.id] = e;
            });
            acc['calendars'] = calendars;
            this.accounts.push(acc);
          }
        });
      }
    });
    this.userService.profile$.subscribe((profile) => {
      this.user = profile;
    });
    this.queryParamSubscription && this.queryParamSubscription.unsubscribe();
    this.queryParamSubscription = this.route.queryParams.subscribe((params) => {
      if (params['code']) {
        const action = this.route.snapshot.params['action'];
        if (action == 'outlook') {
          this.userService
            .authorizeOutlookCalendar(params['code'])
            .subscribe((res) => {
              if (res['status']) {
                const data = {
                  connected_calendar_type: 'outlook',
                  connected_email: res['data'],
                  outlook_refresh_token: params['code']
                };
                this.user.calendar_list.push(data);
                this.userService.updateProfileImpl(this.user);
                this.toast.success(
                  'Your Outlook Calendar is connected successfully.'
                );
                this.router.navigate(['/settings/integration']);
              }
            });
        }
        if (action == 'google') {
          this.userService
            .authorizeGoogleCalendar(params['code'])
            .subscribe((res) => {
              if (res['status']) {
                const data = {
                  connected_calendar_type: 'google',
                  connected_email: res['data'],
                  google_refresh_token: params['code']
                };
                this.user.calendar_list.push(data);
                this.userService.updateProfileImpl(this.user);
                this.toast.success(
                  'Your Google Calendar is connected successfully.'
                );
                this.router.navigate(['/settings/integration']);
              }
            });
        }
      }

      if (params['event']) {
        this.eventId = params['event'];
      }
    });
    let mode, year, month, day;
    mode = this.route.snapshot.params['mode'];
    if (mode) {
      this.view = mode;
      year = this.route.snapshot.params['year'];
      month = this.route.snapshot.params['month'];
      day = this.route.snapshot.params['day'];
      this.viewDate.setFullYear(year);
      this.viewDate.setMonth(month - 1);
      this.viewDate.setDate(day);
    } else {
      mode = 'month';
    }
    switch (mode) {
      case 'month':
        this.location.replaceState(
          `/calendar/month/${this.viewDate.getFullYear()}/${
            this.viewDate.getMonth() + 1
          }/1`
        );
        this.selectedTab = this.tabs[2];
        break;
      case 'week':
        this.location.replaceState(
          `/calendar/week/${this.viewDate.getFullYear()}/${
            startOfWeek(this.viewDate).getMonth() + 1
          }/${startOfWeek(this.viewDate).getDate()}`
        );
        this.weekStart = startOfWeek(this.viewDate).getDate();
        this.weekEnd = endOfWeek(this.viewDate).getDate();
        this.selectedTab = this.tabs[1];
        break;
      case 'day':
        this.location.replaceState(
          `/calendar/day/${this.viewDate.getFullYear()}/${
            this.viewDate.getMonth() + 1
          }/${this.viewDate.getDate()}`
        );
        this.selectedTab = this.tabs[0];
        break;
    }
    const date = this.viewDate.toISOString();
    this.loadEvent(date, mode);
  }

  loadEvent(end_date: string, mode: string): void {
    console.log(this.supplementEvents);
    const supplementEvents = Object.values(this.supplementEvents);
    let events = [];
    supplementEvents.forEach((e) => {
      if (e instanceof Array) {
        events = [...events, ...e];
      }
    });
    this.events = [...this.events, ...events];
    this.events = _.uniqBy(this.events, (e) => e.meta.event_id);
    this.filterEvents();
    this.isLoading = true;
    this.loadSubscription && this.loadSubscription.unsubscribe();
    this.loadSubscription = this.appointmentService
      .getEvents(end_date, mode)
      .subscribe((res) => {
        this.isLoading = false;
        if (res) {
          const _events = [];
          res.forEach((calendar) => {
            if (calendar['status']) {
              const subCalendars =
                calendar['calendar'] && calendar['calendar']['data'];
              subCalendars.forEach((subCalendar) => {
                const events = subCalendar.items;
                events.forEach((event) => {
                  const _formattedEvent = {
                    title: event.title,
                    start: new Date(event.due_start),
                    end: new Date(event.due_end),
                    meta: {
                      contacts: event.contacts,
                      calendar_id: event.calendar_id,
                      description: event.description,
                      location: event.location,
                      type: event.type,
                      guests: event.guests,
                      event_id: event.event_id,
                      recurrence: event.recurrence,
                      recurrence_id: event.recurrence_id,
                      is_organizer: event.is_organizer,
                      organizer: event.organizer
                    }
                  };
                  _events.push(_formattedEvent);
                });
              });
            }
          });
          this.events = _events;
          if (mode === 'month') {
            const end_date_string = moment(end_date)
              .startOf('month')
              .toISOString();
            this.supplementEvents[end_date_string] = _events;
          }
          this.filterEvents();
        }
      });
    this.anotherLoad(end_date, mode);
  }

  anotherLoad(date, mode): void {
    let nextDurationStart;
    let next2DurationStart;
    let prevDurationStart;
    let prev2DurationStart;
    switch (mode) {
      case 'month':
        nextDurationStart = moment(date).startOf('month').add(1, 'months');
        next2DurationStart = moment(date).startOf('month').add(2, 'months');
        prevDurationStart = moment(date).startOf('month').subtract(1, 'months');
        prev2DurationStart = moment(date)
          .startOf('month')
          .subtract(2, 'months');
        break;
      case 'week':
        nextDurationStart = moment(date).startOf('month');
        next2DurationStart = moment(date).startOf('month').add(1, 'months');
        prevDurationStart = moment(date).startOf('month').subtract(1, 'months');
        prev2DurationStart = moment(date)
          .startOf('month')
          .subtract(2, 'months');
        break;
      case 'day':
        nextDurationStart = moment(date).startOf('month');
        next2DurationStart = moment(date).startOf('month').add(1, 'months');
        prevDurationStart = moment(date).startOf('month').subtract(1, 'months');
        prev2DurationStart = moment(date)
          .startOf('month')
          .subtract(2, 'months');
        break;
    }
    const newDurationDates = [
      prev2DurationStart,
      prevDurationStart,
      nextDurationStart,
      next2DurationStart
    ];
    if (mode === 'month' && this.supplementDays.length) {
      newDurationDates.push(moment(date).startOf('month'));
    }
    const durationsToLoad = _.differenceBy(
      newDurationDates,
      this.supplementDays,
      (e) => e.toISOString()
    );
    const durationsToRemove = _.differenceBy(
      this.supplementDays,
      newDurationDates,
      (e) => e.toISOString()
    );
    this.supplementDays = [...newDurationDates];
    if (mode === 'month') {
      this.supplementDays.push(moment(date).startOf('month'));
    }
    durationsToRemove.forEach((duration) => {
      delete this.supplementEvents[duration.toISOString()];
    });
    durationsToLoad.forEach((duration) => {
      this.appointmentService
        .getEvents(duration.toISOString(), 'month')
        .subscribe((_events) => {
          if (_events) {
            this.mergeEvents(_events, duration);
          }
        });
    });
  }

  mergeEvents(_events, duration): void {
    const _results = [];
    _events.forEach((calendar) => {
      if (calendar['status']) {
        const subCalendars =
          calendar['calendar'] && calendar['calendar']['data'];
        subCalendars.forEach((subCalendar) => {
          const events = subCalendar.items;
          events.forEach((event) => {
            const _formattedEvent = {
              title: event.title,
              start: new Date(event.due_start),
              end: new Date(event.due_end),
              meta: {
                contacts: event.contacts,
                calendar_id: event.calendar_id,
                description: event.description,
                location: event.location,
                type: event.type,
                guests: event.guests,
                event_id: event.event_id,
                recurrence: event.recurrence,
                recurrence_id: event.recurrence_id,
                is_organizer: event.is_organizer,
                organizer: event.organizer
              }
            };
            _results.push(_formattedEvent);
          });
        });
      }
    });
    this.supplementEvents[duration.toISOString()] = _results;

    // this.supplementEvents = [...this.supplementEvents, ..._results];
    // this.supplementEvents = _.uniqBy(
    //   this.supplementEvents,
    //   (e) => e.meta.event_id
    // );
  }

  getDayEvent(date: any): any {
    if (date) {
      try {
        const key = date.toISOString().split('T')[0];
        return this.dayEvents[key];
      } catch (err) {
        return [];
      }
    } else {
      const datesArr = Object.values(this.dayEvents);
      if (datesArr && datesArr.length) {
        return datesArr[0];
      } else {
        return [];
      }
    }
  }

  isSelectedCalendar(calendar): boolean {
    if (this.selectedCalendars.indexOf(calendar.id) === -1) {
      return false;
    } else {
      return true;
    }
  }

  toggleCalendar(calendar): void {
    const pos = this.selectedCalendars.indexOf(calendar.id);
    if (pos === -1) {
      this.selectedCalendars.push(calendar.id);
    } else {
      this.selectedCalendars.splice(pos, 1);
    }
    this.filterEvents();
  }

  filterEvents(): void {
    this.dayEvents = {};
    this.showingEvents = [];
    this.events.forEach((e) => {
      if (this.selectedCalendars.indexOf(e.meta.calendar_id) !== -1) {
        this.showingEvents.push(e);
        if (e.start === e.end) {
          const key = e.start.toISOString();
          if (this.dayEvents[key]) {
            this.dayEvents[key].push(e);
          } else {
            this.dayEvents[key] = [e];
          }
        }
      }
    });

    // Open the popup if the router has event id
    if (this.eventId) {
      setTimeout(() => {
        const dom = document.querySelector(`[event='${this.eventId}']`);
        this.events.some((e) => {
          if (this.eventId === e.meta.event_id) {
            if (dom) {
              this.openDetail(e, dom);
            }
            return true;
          }
        });
        this.eventId = '';
      }, 1000);
    }
  }

  newEvent(): void {
    this.overlayService.close(null);
    this.dialog
      .open(CalendarDialogComponent, {
        width: '100vw',
        maxWidth: '600px'
      })
      .afterClosed()
      .subscribe((res) => {
        if (res) {
          const newEvent = this._convertStandard2Original(res);
          const event = this._convertStandard2Mine(newEvent);
          this.events.push(event);
          this.filterEvents();
          this.changeDetectorRef.detectChanges();
        }
      });
  }

  createEvent($event): void {
    const newEvent = this._convertStandard2Original($event);
    const event = this._convertStandard2Mine(newEvent);
    this.events.push(event);
    this.filterEvents();
    this.changeDetectorRef.detectChanges();
  }

  changeTab(tab: TabItem): void {
    this.selectedTab = tab;
    switch (this.selectedTab.id) {
      case 'month':
        this.location.replaceState(
          `/calendar/month/${this.viewDate.getFullYear()}/${
            this.viewDate.getMonth() + 1
          }/1`
        );
        this.view = CalendarView.Month;
        break;
      case 'week':
        this.location.replaceState(
          `/calendar/week/${this.viewDate.getFullYear()}/${
            startOfWeek(this.viewDate).getMonth() + 1
          }/${startOfWeek(this.viewDate).getDate()}`
        );
        this.view = CalendarView.Week;
        this.weekStart = startOfWeek(this.viewDate).getDate();
        this.weekEnd = endOfWeek(this.viewDate).getDate();
        break;
      case 'day':
        this.location.replaceState(
          `/calendar/day/${this.viewDate.getFullYear()}/${
            this.viewDate.getMonth() + 1
          }/${this.viewDate.getDate()}`
        );
        this.view = CalendarView.Day;
        break;
    }
    const date = this.viewDate.toISOString();
    this.loadEvent(date, this.selectedTab.id);
  }

  calendarDateChange(mode = ''): void {
    switch (this.view) {
      case 'month':
        this.location.replaceState(
          `/calendar/month/${this.viewDate.getFullYear()}/${
            this.viewDate.getMonth() + 1
          }/1`
        );
        break;
      case 'week':
        this.location.replaceState(
          `/calendar/week/${this.viewDate.getFullYear()}/${
            startOfWeek(this.viewDate).getMonth() + 1
          }/${startOfWeek(this.viewDate).getDate()}`
        );
        this.weekStart = startOfWeek(this.viewDate).getDate();
        this.weekEnd = endOfWeek(this.viewDate).getDate();
        break;
      case 'day':
        this.location.replaceState(
          `/calendar/day/${this.viewDate.getFullYear()}/${
            this.viewDate.getMonth() + 1
          }/${this.viewDate.getDate()}`
        );
        break;
    }
    const date = this.viewDate.toISOString();
    this.loadEvent(date, this.selectedTab.id);
  }

  openOverlay(day: any, trigger: any): void {
    const triggerEl = <HTMLElement>trigger;
    const originBounding = triggerEl.getBoundingClientRect();
    const originX = originBounding.x;
    const originY = originBounding.y;
    const originW = originBounding.width;
    const originH = originBounding.height;
    const originEndX = originX + originW;
    let originEndY = originY + originH;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    originEndY = originEndY > screenH - 30 ? screenH - 30 : originEndY;

    const size = {
      maxWidth: '550px',
      minWidth: '300px',
      maxHeight: 700,
      minHeight: 320
    };
    const positionStrategy = this.overlay.position().global();
    if (originX > 570) {
      // Set Right of overlay
      positionStrategy.left(originX - 570 + 'px');
    } else if (originX > 500) {
      positionStrategy.left(10 + 'px');
    } else if (screenW - originEndX > 570) {
      positionStrategy.left(originEndX + 20 + 'px');
    } else if (screenW - originEndX > 500) {
      positionStrategy.left(originEndX + 20 + 'px');
    } else {
      positionStrategy.centerHorizontally();
    }

    if (screenH < 600) {
      positionStrategy.centerVertically();
      size['height'] = screenH - 70;
    } else if (screenH - originY > 710) {
      positionStrategy.top(originY - 10 + 'px');
      size['height'] = 690;
    } else if (originEndY > 710) {
      positionStrategy.bottom(screenH - originEndY - 10 + 'px');
      size['height'] = 690;
    } else {
      positionStrategy.top('100px');
      size['height'] = screenH - 120;
    }

    this.templatePortal = new TemplatePortal(
      this.creatPortalContent,
      this._viewContainerRef
    );

    if (day && day.date) {
      this.selectedDate = day.date;
    } else {
      this.selectedDate = day;
    }

    if (this.overlayRef) {
      if (this.overlayRef.hasAttached()) {
        this.overlayRef.detach();
        return;
      } else {
        this.overlayRef.updatePositionStrategy(positionStrategy);
        this.overlayRef.updateSize(size);
        this.overlayRef.attach(this.templatePortal);
        return;
      }
    } else {
      this.overlayRef = this.overlay.create({
        scrollStrategy: this.overlay.scrollStrategies.block(),
        positionStrategy,
        ...size
      });
      this.overlayRef.attach(this.templatePortal);
    }

    if (this.overlayRef) {
      this.overlayCloseSubscription &&
        this.overlayCloseSubscription.unsubscribe();
      this.overlayCloseSubscription = this.overlayRef
        .outsidePointerEvents()
        .subscribe((event) => {
          const targetEl = <HTMLElement>event.target;
          console.log(
            'calendar contact select trigger',
            targetEl,
            targetEl.closest('.cal-event'),
            targetEl.closest('.cal-month-cell'),
            targetEl.closest('.event-backdrop'),
            targetEl.closest('.event-panel'),
            targetEl.closest('.calendar-contact')
          );
          if (targetEl.closest('.cal-event')) {
            return;
          }
          if (targetEl.closest('.cal-month-cell')) {
            return;
          }
          if (targetEl.closest('.event-backdrop')) {
            return;
          }
          if (targetEl.closest('.event-panel')) {
            return;
          }
          if (targetEl.closest('.calendar-contact')) {
            return;
          }
          this.overlayRef.detach();
          return;
        });
    }
  }

  openDetail(event: any, trigger: any): void {
    this.event = event;

    const triggerEl = <HTMLElement>trigger;
    const originBounding = triggerEl.getBoundingClientRect();
    const originX = originBounding.x;
    const originY = originBounding.y;
    const originW = originBounding.width;
    const originH = originBounding.height;
    const originEndX = originX + originW;
    let originEndY = originY + originH;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    originEndY = originEndY > screenH - 30 ? screenH - 30 : originEndY;

    const size = {
      maxWidth: '360px',
      minWidth: '300px',
      maxHeight: 410,
      minHeight: 320
    };
    const positionStrategy = this.overlay.position().global();
    if (originX > 380) {
      // Set Right of overlay
      positionStrategy.left(originX - 380 + 'px');
    } else if (originX > 320) {
      positionStrategy.left(10 + 'px');
    } else if (screenW - originEndX > 380) {
      positionStrategy.left(originEndX + 20 + 'px');
    } else if (screenW - originEndX > 320) {
      positionStrategy.left(originEndX + 20 + 'px');
    } else {
      positionStrategy.centerHorizontally();
    }

    if (screenH < 380) {
      positionStrategy.centerVertically();
      // size['height'] = screenH - 40;
    } else if (screenH - originY > 420) {
      positionStrategy.top(originY + 'px');
      // size['height'] = 420;
    } else if (originEndY > 420) {
      positionStrategy.bottom(screenH - originEndY + 'px');
      // size['height'] = 420;
    } else {
      positionStrategy.top('30px');
      // size['height'] = screenH - 50;
    }
    size['height'] = 'unset';

    this.templatePortal = new TemplatePortal(
      this.detailPortalContent,
      this._viewContainerRef
    );

    if (this.overlayRef) {
      if (this.overlayRef.hasAttached()) {
        this.overlayRef.detach();
      }
      this.overlayRef.updatePositionStrategy(positionStrategy);
      this.overlayRef.updateSize(size);
      this.overlayRef.attach(this.templatePortal);
      return;
    } else {
      this.overlayRef = this.overlay.create({
        scrollStrategy: this.overlay.scrollStrategies.block(),
        positionStrategy,
        ...size
      });
      this.overlayRef.outsidePointerEvents().subscribe((event) => {
        const targetEl = <HTMLElement>event.target;
        if (targetEl.closest('.cal-event')) {
          return;
        }
        if (targetEl.closest('.cal-month-cell')) {
          return;
        }
        if (targetEl.closest('.event-backdrop')) {
          return;
        }
        if (targetEl.closest('.event-panel')) {
          return;
        }
        this.overlayRef.detach();
        return;
      });
      this.overlayRef.attach(this.templatePortal);
    }
  }

  closeOverlay(event: any): void {
    if (this.overlayRef) {
      this.overlayRef.detach();
    }
    if (event) {
      if (event.command === 'delete' && event.data) {
        this.events.some((e, index) => {
          if (e.meta.event_id === event.data.event_id) {
            this.events.splice(index, 1);
            return true;
          }
        });
        this.filterEvents();
      }
    }
  }

  _convertMine2Standard(event: any) {
    const res = {};
  }

  _convertStandard2Mine(event: any) {
    const res = {
      title: event.title,
      start: new Date(event.due_start),
      end: new Date(event.due_end),
      meta: {
        contacts: event.contacts,
        calendar_id: event.calendar_id,
        description: event.description,
        location: event.location,
        type: event.type,
        guests: event.guests,
        event_id: event.event_id,
        recurrence: event.recurrence,
        recurrence_id: event.recurrence_id,
        is_organizer: event.is_organizer,
        organizer: event.organizer
      }
    };
    return res;
  }
  _convertStandard2Original(event: any) {
    if (event.guests && event.guests.length) {
      const guests = [];
      event.guests.forEach((e) => {
        let guest;
        if (typeof e === 'string') {
          guest = {
            response: 'needsAction',
            email: e
          };
        } else {
          guest = e;
        }
        guests.push(guest);
      });
      event.guests = guests;
    }
    return event;
  }

  getDurationOption(start, end): boolean {
    let startDate, endDate;
    if (typeof start === 'string') {
      startDate = new Date(start);
    } else {
      startDate = start;
    }
    if (typeof end === 'string') {
      endDate = new Date(end);
    } else {
      endDate = end;
    }
    const startHour = startDate.getHours();
    const endHour = endDate.getHours();

    return (
      (startHour >= 12 && endHour >= 12) || (startHour <= 12 && endHour <= 12)
    );
  }
}
