import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { ErrorService } from './error.service';
import { HttpClient } from '@angular/common/http';
import { StoreService } from './store.service';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { CONTACT, TEAM } from '../constants/api.constant';
import {
  Contact,
  ContactActivity,
  ContactDetail
} from '../models/contact.model';
import { ActivityDetail } from '../models/activityDetail.model';
import { map, catchError } from 'rxjs/operators';
import { STATUS } from '../constants/variable.constants';
import { SearchOption } from '../models/searchOption.model';
import * as _ from 'lodash';
interface LoadResponse {
  contacts: ContactActivity[];
}
@Injectable({
  providedIn: 'root'
})
export class ContactService extends HttpService {
  forceReload: BehaviorSubject<boolean> = new BehaviorSubject(false);
  loadStatus: BehaviorSubject<string> = new BehaviorSubject(STATUS.NONE);
  loading$ = this.loadStatus.asObservable();
  total: BehaviorSubject<number> = new BehaviorSubject(0);
  total$ = this.total.asObservable();
  searchOption: BehaviorSubject<SearchOption> = new BehaviorSubject(
    new SearchOption()
  );
  searchOption$ = this.searchOption.asObservable();
  searchStr: BehaviorSubject<string> = new BehaviorSubject('');
  searchStr$ = this.searchStr.asObservable();
  pageIndex: BehaviorSubject<number> = new BehaviorSubject(1);
  pageIndex$ = this.pageIndex.asObservable();
  pageSize: BehaviorSubject<number> = new BehaviorSubject(50);
  pageSize$ = this.pageSize.asObservable();

  loadSubscription: Subscription;

  constructor(
    errorService: ErrorService,
    private httpClient: HttpClient,
    private storeService: StoreService
  ) {
    super(errorService);
    this.searchOption$.subscribe(() => {
      this.loadPage();
    });

    this.searchStr$.subscribe(() => {
      this.loadPage();
    });
  }

  /**
   * Create Contact
   * @param contact
   */
  create(contact: Contact): Observable<Contact> {
    return this.httpClient.post(this.server + CONTACT.CREATE, contact).pipe(
      map((res) => new Contact().deserialize(res['data'])),
      catchError(this.handleError('CONTACT CREATE', null))
    );
  }
  /**
   * Read the Detail information of the contact and Emit the Behavior Subject
   * @param _id: Contact Id to read the detail information
   * @param sortInfo: Page sort information for the next and prev contact
   */
  read(_id: string, sortInfo = {}): void {
    this.readImpl(_id, sortInfo).subscribe((res) => {
      if (res) {
        this.storeService.selectedContact.next(res);
      }
    });
  }
  /**
   * Read the Detail information of the contact
   * @param _id: Contact Id to read the detail information
   * @param sortInfo: Page sort information for the next and prev contact
   */
  readImpl(_id: string, sortInfo = {}): Observable<ContactDetail> {
    return this.httpClient
      .post(this.server + CONTACT.READ + _id, sortInfo)
      .pipe(
        map((res) => new ContactDetail().deserialize(res['data'])),
        catchError(this.handleError('CONTACT DETAIL', null))
      );
  }
  reloadDetail(): void {
    const contact = this.storeService.selectedContact.getValue();
    if (contact && contact._id) {
      this.readImpl(contact._id, {}).subscribe((res) => {
        if (res) {
          this.storeService.selectedContact.next(res);
        }
      });
    }
  }

  update(contact): Observable<any> {
    return this.httpClient
      .post(this.server + CONTACT.UPDATE, { ...contact })
      .pipe(
        map((res) => res),
        catchError(this.handleError('UPDATE CONTACT', []))
      );
  }

  updateContact(id: string, contact: any): Observable<any> {
    return this.httpClient.put(this.server + CONTACT.READ + id, contact).pipe(
      map((res) => res['data']),
      catchError(this.handleError('UPDATE CONTACT', []))
    );
  }

  delete(_id: string): void {}
  bulkDelete(_ids: string[]): Observable<boolean> {
    return this.httpClient
      .post(this.server + CONTACT.BULK_DELETE, { ids: _ids })
      .pipe(
        map((res) => res['data']),
        catchError(this.handleError('DELETE CONTACTS', false))
      );
  }
  delete$(contacts: Contact[]): any {
    const pageContacts = this.storeService.pageContacts.getValue();
    const remainedContacts = _.differenceBy(pageContacts, contacts, '_id');
    this.storeService.pageContacts.next(remainedContacts);

    const total = this.total.getValue();
    this.total.next(total - contacts.length);
    return {
      page: remainedContacts.length,
      total: total - contacts.length
    };
  }
  /**
   *
   * @param _ids : contact id array
   * @param contact : information to update
   * @param tagData : tag information to update (remove, add)
   */
  bulkUpdate(_ids: string[], contact: any, tagData: any): Observable<boolean> {
    return this.httpClient
      .post(this.server + CONTACT.BULK_UPDATE, {
        contacts: _ids,
        data: contact,
        tags: tagData
      })
      .pipe(
        map((res) => res['status'] || false),
        catchError(this.handleError('BULK UPDATE', false))
      );
  }
  /**
   * download the csv of selected contacts
   * @param _ids : contact id array
   */
  downloadCSV(_ids: string[]): Observable<any[]> {
    return this.httpClient
      .post(this.server + CONTACT.EXPORT, {
        contacts: _ids
      })
      .pipe(
        map((res) => res['data'] || []),
        catchError(this.handleError('DOWNLOAD CSV', []))
      );
  }

  loadPage(): void {
    const searchOption = this.searchOption.getValue();
    const searchStr = this.searchStr.getValue();
    if (searchOption.isEmpty()) {
      if (searchStr) {
        // Call Normal Search
        this.normalSearch(searchStr);
      } else {
        // Call Normal Load
        this.load(0);
      }
    } else {
      this.advancedSearch(searchStr);
    }
  }
  reloadPage(): void {
    const searchOption = this.searchOption.getValue();
    const searchStr = this.searchStr.getValue();
    if (searchOption.isEmpty()) {
      if (searchStr) {
        // Call Normal Search
        this.normalSearch(searchStr);
      } else {
        // Call Normal Load
        const page = this.pageIndex.getValue();
        const pageSize = this.pageSize.getValue();
        let skip = (page - 1) * pageSize;
        skip = skip < 0 ? 0 : skip;
        this.load(skip);
      }
    } else {
      this.advancedSearch(searchStr);
    }
  }
  /**
   * Load Contacts and update the store
   * @param page : Contact Page Number
   */
  load(page: number): void {
    this.loadStatus.next(STATUS.REQUEST);
    this.loadSubscription && this.loadSubscription.unsubscribe();
    this.loadSubscription = this.loadImpl(page).subscribe((res) => {
      res
        ? this.loadStatus.next(STATUS.SUCCESS)
        : this.loadStatus.next(STATUS.FAILURE);
      if (res && res['contacts']) {
        this.storeService.pageContacts.next(res['contacts']);
        this.total.next(res['total']);
      }
    });
  }
  /**
   * Call API & Load Contacts
   * @param page
   */
  loadImpl(page: number): Observable<any> {
    this.loadStatus.next(STATUS.REQUEST);
    return this.httpClient
      .post(this.server + CONTACT.LOAD_PAGE + page, {
        field: 'name',
        dir: true
      })
      .pipe(
        map((res) => {
          const contacts = [];
          (res['data']['contacts'] || []).forEach((e) => {
            contacts.push(new ContactActivity().deserialize(e));
          });
          return {
            contacts,
            total: res['data']['count'] || 0
          };
        }),
        catchError(
          this.handleError('LOAD CONTACTS', { contacts: [], total: 0 })
        )
      );
  }

  /**
   * Advanced Search Call
   * @param str : keyword in the advanced search
   */
  advancedSearch(str: string): void {
    this.loadStatus.next(STATUS.REQUEST);
    this.loadSubscription && this.loadSubscription.unsubscribe();
    this.loadSubscription = this.advancedSearchImpl(str).subscribe(
      (contacts) => {
        contacts
          ? this.loadStatus.next(STATUS.SUCCESS)
          : this.loadStatus.next(STATUS.FAILURE);
        this.storeService.pageContacts.next(contacts || []);
        this.total.next((contacts || []).length);
      }
    );
  }
  advancedSearchImpl(str: string): Observable<ContactActivity[]> {
    const searchOption = this.searchOption.getValue();
    return this.httpClient
      .post(this.server + CONTACT.ADVANCE_SERACH, {
        ...searchOption,
        searchStr: str
      })
      .pipe(
        map((res) =>
          (res['data'] || []).map((e) => new ContactActivity().deserialize(e))
        ),
        catchError(this.handleError('ADVANCED FILTER', null))
      );
  }

  /**
   * Normal Search Call
   * @param str : keyword in the normal search
   */
  normalSearch(str: string): void {
    this.loadStatus.next(STATUS.REQUEST);
    this.loadSubscription && this.loadSubscription.unsubscribe();
    this.loadSubscription = this.normalSearchImpl(str).subscribe((contacts) => {
      contacts
        ? this.loadStatus.next(STATUS.SUCCESS)
        : this.loadStatus.next(STATUS.FAILURE);
      this.storeService.pageContacts.next(contacts || []);
      this.total.next((contacts || []).length);
    });
  }
  normalSearchImpl(str: string): Observable<ContactActivity[]> {
    return this.httpClient
      .post(this.server + CONTACT.NORMAL_SEARCH, {
        search: str
      })
      .pipe(
        map((res) =>
          (res['data']['contacts'] || []).map((e) =>
            new ContactActivity().deserialize(e)
          )
        ),
        catchError(this.handleError('FILTER', null))
      );
  }
  filter(query): Observable<Contact[]> {
    return this.httpClient.post(this.server + CONTACT.FILTER, query).pipe(
      map((res) => res['data'] || []),
      catchError(this.handleError('FILTER CONTACTS', []))
    );
  }
  getNormalSearch(str: string): any {
    return this.httpClient.post(this.server + CONTACT.NORMAL_SEARCH, {
      search: str
    });
  }
  getPageContacts(page, sort): Observable<any> {
    return this.httpClient
      .post(this.server + CONTACT.LOAD_PAGE + page, sort)
      .pipe(
        map((res) => res['data'] || []),
        catchError(this.handleError('LOAD CONTACTS', []))
      );
  }
  // getSearchedContacts(query): Observable<any> {
  //   return this.httpClient.post(this.server + CONTACT.LOAD_SERACH, query).pipe(
  //     map((res) => res),
  //     catchError(this.handleError('SEARCH CONTACTS', []))
  //   );
  // }
  /**
   * Reduce the Page size
   * @param pageSize : New Page size of the Contacts
   */
  resizePage(pageSize: number): void {
    const contacts = this.storeService.pageContacts.getValue();
    const reduced = contacts.slice(0, pageSize);
    this.storeService.pageContacts.next(reduced);
  }
  /**
   * Search the contacts using keyword.
   * @param keyword : keyword
   */
  easySearch(keyword: string): Observable<Contact[]> {
    return this.httpClient
      .post(this.server + CONTACT.QUICK_SEARCH, { search: keyword })
      .pipe(
        map((res) =>
          (res['data'] || []).map((data) => new Contact().deserialize(data))
        ),
        catchError(this.handleError('SEARCH CONTACTS', []))
      );
  }
  /**
   * Find the contacts that sent the selected material lately
   * @param _id :Material id
   */
  latestContacts(_id: string): Observable<ActivityDetail[]> {
    return this.httpClient
      .get(this.server + CONTACT.LATEST_CONTACTS + _id)
      .pipe(
        map((res) => res['data'] || []),
        catchError(this.handleError('GET LATEST CONTACTS', []))
      );
  }
  /**
   * Select All Contacts
   */
  selectAll(): Observable<any> {
    return this.httpClient.get(this.server + CONTACT.SELECT_ALL).pipe(
      map((res) =>
        (res['data'] || []).map((e) => new Contact().deserialize(e))
      ),
      catchError(this.handleError('SELECT ALL CONTACTS', []))
    );
  }
  /**
   * Load the contacts information by contact ids
   * @param ids : contact id array
   */
  getContactsByIds(ids: string[]): Observable<any> {
    return this.httpClient
      .post(this.server + CONTACT.LOAD_BY_IDS, { ids })
      .pipe(
        map((res) => res['data'] || []),
        catchError(this.handleError('SEARCH CONTACTS', []))
      );
  }

  /**
   * merge two contacts
   * @param data : primary, secondaries, result contacts
   */
  mergeContacts(data): Observable<Contact> {
    return this.httpClient.post(this.server + CONTACT.MERGE, { ...data }).pipe(
      map((res) => res['data'] || []),
      catchError(this.handleError('MERGE CONTACTS', []))
    );
  }

  bulkCreate(contacts): Observable<any> {
    return this.httpClient
      .post(this.server + CONTACT.BULK_CREATE, { contacts })
      .pipe(
        map((res) => res),
        catchError(this.handleError('BULK CREATE CONTACTS', null))
      );
  }

  clear$(): void {
    this.loadStatus.next(STATUS.NONE);
    this.total.next(0);
    this.pageIndex.next(1);
    this.pageSize.next(50);
  }

  checkEmail(email: string): any {
    return this.httpClient
      .post(this.server + CONTACT.CHECK_EMAIL, { email })
      .pipe(
        map((res) =>
          (res['data'] || []).map((e) => new Contact().deserialize(e))
        ),
        catchError(this.handleError('EMAIL CHECKING', []))
      );
  }

  checkPhone(cell_phone: string): any {
    return this.httpClient
      .post(this.server + CONTACT.CHECK_PHONE, {
        cell_phone
      })
      .pipe(
        map((res) =>
          (res['data'] || []).map((e) => new Contact().deserialize(e))
        ),
        catchError(this.handleError('PHONE CHECKING', []))
      );
  }

  shareContacts(userId, contacts): Observable<any> {
    return this.httpClient
      .post(this.server + CONTACT.SHARE_CONTACT, {
        user: userId,
        contacts
      })
      .pipe(
        map((res) => res),
        catchError(this.handleError('BULK CREATE CONTACTS', []))
      );
  }
}
