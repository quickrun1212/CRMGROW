import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AUTOMATION } from '../constants/api.constant';
import { STATUS } from '../constants/variable.constants';
import { Automation } from '../models/automation.model';
import { ErrorService } from './error.service';
import { HttpService } from './http.service';

@Injectable({
  providedIn: 'root'
})
export class AutomationService extends HttpService {
  constructor(errorService: ErrorService, private httpClient: HttpClient) {
    super(errorService);
  }

  automations: BehaviorSubject<Automation[]> = new BehaviorSubject([]);
  automations$ = this.automations.asObservable();
  loadStatus: BehaviorSubject<string> = new BehaviorSubject(STATUS.NONE);
  loading$ = this.loadStatus.asObservable();

  /**
   * Load All Automations
   * @param force Flag to load force
   */
  loadAll(force = false): void {
    if (!force) {
      const loadStatus = this.loadStatus.getValue();
      if (loadStatus != STATUS.NONE && loadStatus != STATUS.FAILURE) {
        return;
      }
    }
    this.loadStatus.next(STATUS.REQUEST);
    this.loadAllImpl().subscribe((automations) => {
      automations
        ? this.loadStatus.next(STATUS.SUCCESS)
        : this.loadStatus.next(STATUS.FAILURE);
      this.automations.next(automations || []);
    });
  }
  /**
   * Call Load API
   */
  loadAllImpl(): Observable<Automation[]> {
    return this.httpClient.get(this.server + AUTOMATION.LOAD_ALL).pipe(
      map((res) =>
        (res['data'] || []).map((e) => new Automation().deserialize(e))
      ),
      catchError(this.handleError('LOAD ALL AUTOMATION', null))
    );
  }

  search(keyword: string): Observable<Automation[]> {
    return this.httpClient
      .post(this.server + AUTOMATION.SEARCH, { search: keyword })
      .pipe(
        map((res) =>
          (res['data'] || []).map((e) => new Automation().deserialize(e))
        ),
        catchError(this.handleError('SEARCH AUTOMATION', []))
      );
  }
  getByPage(page: string): Observable<any> {
    return this.httpClient.get(this.server + AUTOMATION.LOAD_PAGE).pipe(
      map((res) => res),
      catchError(this.handleError('GET AUTOMATION PAGE BY ID', []))
    );
  }
  getStatus(id, contacts): Observable<Automation[]> {
    return this.httpClient
      .post(this.server + AUTOMATION.DETAIL + id, { contacts })
      .pipe(
        map((res) => res['data'] || []),
        catchError(this.handleError('GET AUTOMATION STATUS', []))
      );
  }
  delete(id): Observable<Automation[]> {
    return this.httpClient.delete(this.server + AUTOMATION.DELETE + id).pipe(
      map((res) => res['data'] || []),
      catchError(this.handleError('DELETE AUTOMATION', []))
    );
  }
  get(id): Observable<Automation[]> {
    return this.httpClient.get(this.server + AUTOMATION.READ + id).pipe(
      map((res) => res['data'] || []),
      catchError(this.handleError('READ AUTOMATION', []))
    );
  }
  update(id, automation): Observable<Automation[]> {
    return this.httpClient
      .put(this.server + AUTOMATION.UPDATE + id, automation)
      .pipe(
        map((res) => res['data'] || []),
        catchError(this.handleError('UPDATE AUTOMATION', []))
      );
  }
  create(body): Observable<Automation[]> {
    return this.httpClient.post(this.server + AUTOMATION.CREATE, body).pipe(
      map((res) => res['data'] || []),
      catchError(this.handleError('GET AUTOMATION STATUS', []))
    );
  }
  bulkAssign(contacts, automation): Observable<Automation[]> {
    return this.httpClient
      .post(this.server + AUTOMATION.ASSIGN, {
        contacts,
        automation_id: automation
      })
      .pipe(
        map((res) => res['data'] || []),
        catchError(this.handleError('AUTOMATION BULK ASSIGN', []))
      );
  }

  loadOwn(): Observable<Automation[]> {
    return this.httpClient.get(this.server + AUTOMATION.LOAD_OWN).pipe(
      map((res) => res['data'] || []),
      catchError(this.handleError('LOAD OWN AUTOMATION', []))
    );
  }
}
