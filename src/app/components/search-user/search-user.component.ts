import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter
} from '@angular/core';
import { FormControl } from '@angular/forms';
import {
  MatAutocomplete,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
import { ReplaySubject, Subject, Subscription } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  takeUntil,
  tap
} from 'rxjs/operators';
import { User } from 'src/app/models/user.model';
import { TeamService } from 'src/app/services/team.service';
import { validateEmail } from 'src/app/utils/functions';

@Component({
  selector: 'app-search-user',
  templateUrl: './search-user.component.html',
  styleUrls: ['./search-user.component.scss']
})
export class SearchUserComponent implements OnInit, OnDestroy {
  separatorKeyCodes: number[] = [ENTER, COMMA];

  @Input('placeholder') placeholder = 'Team or user';
  @Input('isNewAvailable') isNewAvailable = true;
  @Input('primaryField') primaryField = 'email';
  @Output() onSelect = new EventEmitter<User>();

  inputControl: FormControl = new FormControl();
  @ViewChild('inputField') inputField: ElementRef;
  @ViewChild('auto') autoComplete: MatAutocomplete;

  protected _onDestroy = new Subject<void>();

  filteredUsers: ReplaySubject<User[]> = new ReplaySubject<User[]>(1);
  searching = false;
  keyword = '';
  addOnBlur = false;

  apiSubscription: Subscription;

  constructor(private teamService: TeamService) {}

  ngOnInit(): void {
    this.inputControl.valueChanges
      .pipe(
        filter((search) => {
          if (typeof search === 'string') {
            return !!search;
          } else {
            return false;
          }
        }),
        takeUntil(this._onDestroy),
        debounceTime(50),
        distinctUntilChanged(),
        tap((search) => {
          this.keyword = search;
          this.searching = true;
        }),
        map((search) => {
          return this.teamService.searchUser(search);
        })
      )
      .subscribe((api) => {
        this.apiSubscription && this.apiSubscription.unsubscribe();
        this.apiSubscription = api.subscribe(
          (res) => {
            this.searching = false;
            if (this.isNewAvailable) {
              if (res.length) {
                this.filteredUsers.next(res);
              } else {
                // Email primary field
                if (
                  this.primaryField === 'email' &&
                  validateEmail(this.keyword)
                ) {
                  const user_name = this.keyword.split('@')[0];
                  const email = this.keyword;
                  res.push(
                    new User().deserialize({
                      user_name,
                      email
                    })
                  );
                }
                // TODO: phone primary field
                // emit the result to filtered users
                this.filteredUsers.next(res);
              }
            } else {
              this.filteredUsers.next(res);
            }
          },
          () => {
            this.searching = false;
          }
        );
      });
  }
  ngOnDestroy(): void {}

  /**
   * Selected value and emit to parent
   * @param event : Autocomplete Select event
   */
  onSelectOption(event: MatAutocompleteSelectedEvent): void {
    const value = event.option.value;
    this.onSelect.emit(value);
    this.inputField.nativeElement.value = '';
  }
}
