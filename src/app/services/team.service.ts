import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TEAM } from '../constants/api.constant';
import { Team } from '../models/team.model';
import { ErrorService } from './error.service';
import { HttpService } from './http.service';
import { TeamCall } from '../models/team-call.model';
import { User } from '../models/user.model';
import { environment } from 'src/environments/environment';
import { STATUS } from '../constants/variable.constants';
import * as _ from 'lodash';
@Injectable({
  providedIn: 'root'
})
export class TeamService extends HttpService {
  constructor(errorService: ErrorService, private httpClient: HttpClient) {
    super(errorService);
  }

  teams: BehaviorSubject<Team[]> = new BehaviorSubject([]);
  teams$ = this.teams.asObservable();
  loadStatus: BehaviorSubject<string> = new BehaviorSubject(STATUS.NONE);
  loading$ = this.loadStatus.asObservable();

  invites: BehaviorSubject<Team[]> = new BehaviorSubject([]);
  invites$ = this.invites.asObservable();
  invitesLoadStatus: BehaviorSubject<string> = new BehaviorSubject(STATUS.NONE);
  invitesLoading$ = this.loadStatus.asObservable();

  /**
   * LOAD ALL TEMPLATES
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
    this.loadAllImpl().subscribe((teams) => {
      teams
        ? this.loadStatus.next(STATUS.SUCCESS)
        : this.loadStatus.next(STATUS.FAILURE);
      this.teams.next(teams || []);
    });
  }

  /**
   * CALL LOAD API
   */
  loadAllImpl(): Observable<Team[]> {
    return this.httpClient.get(this.server + TEAM.LOAD).pipe(
      map((res) => (res['data'] || []).map((e) => new Team().deserialize(e))),
      catchError(this.handleError('LOAD TEAM', null))
    );
  }

  /**
   * Load the Team Leaders
   */
  loadLeaders(): Observable<User[]> {
    return this.httpClient.get(this.server + TEAM.LOAD_LEADERS).pipe(
      map((res) =>
        (res['data'] || []).map((data) => new User().deserialize(data))
      ),
      catchError(this.handleError('LOAD LEADERS', []))
    );
  }
  /**
   * Search team or user by keyword
   * Response Data: {status, team_array, user_array}
   * @param keyword : keyword to search
   */
  searchTeamUser(keyword: string): Observable<any> {
    return this.httpClient
      .post(this.server + TEAM.SEARCH_TEAM_USER, { search: keyword })
      .pipe(
        map((res) => res),
        catchError(this.handleError('SEARCH TEAM AND USERS', {}))
      );
  }
  /**
   * search the teams by id of the user that is included.
   * Response Data: Team array observable
   * @param id : id of the user that included team
   */
  searchTeamByUser(id: string): Observable<Team[]> {
    return this.httpClient
      .get(this.server + TEAM.SEARCH_TEAM_BY_USER + id)
      .pipe(
        map((res) => (res['data'] || []).map((e) => new Team().deserialize(e))),
        catchError(this.handleError('SEARCH TEAMS BY USER', []))
      );
  }
  /**
   * Search user -> This is part of the team and user search
   * @param keyword: string to search users
   */
  searchUser(keyword: string): Observable<User[]> {
    return this.httpClient
      .post(this.server + TEAM.SEARCH_TEAM_USER, { search: keyword })
      .pipe(
        map((res) =>
          (res['user_array'] || []).map((e) => new User().deserialize(e))
        ),
        catchError(this.handleError('SEARCH USERS', {}))
      );
  }

  /**
   * Load the invites and Put them to Subject
   */
  loadInvites(force = false): void {
    if (!force) {
      const loadStatus = this.invitesLoadStatus.getValue();
      if (loadStatus != STATUS.NONE && loadStatus != STATUS.FAILURE) {
        return;
      }
    }
    this.invitesLoadStatus.next(STATUS.REQUEST);
    this.loadInvitesImpl().subscribe((teams) => {
      teams
        ? this.invitesLoadStatus.next(STATUS.SUCCESS)
        : this.invitesLoadStatus.next(STATUS.FAILURE);
      this.invites.next(teams || []);
    });
  }

  /**
   * Call API to Load Invites
   */
  loadInvitesImpl(): Observable<Team[]> {
    return this.httpClient.get(this.server + TEAM.LOAD_INVITED).pipe(
      map((res) => (res['data'] || []).map((e) => new Team().deserialize(e))),
      catchError(this.handleError('LOAD INVITED TEAM', []))
    );
  }

  /**
   * Send the request to join
   * @param request: request object to join (searchedUser: user_id array || undefined, team_id: id of team)
   */
  requestJoin(request: any): Observable<any> {
    return this.httpClient
      .post(environment.api + TEAM.JOIN_REQUEST, request)
      .pipe(
        map((res) => res),
        catchError(this.handleError('TEAM JOIN REQUST', null))
      );
  }
  /**
   * Send invitation to the internal users and external users (internal users are identified by user ids, external users are identified by emails)
   * @param id : _id of Team
   * @param invitations : _id array of internal users
   * @param referrals : email array of external users
   */
  inviteUsers(
    id: string,
    invitations: string[],
    referrals: string[]
  ): Observable<any> {
    return this.httpClient
      .post(this.server + TEAM.INVITE_USERS + id, {
        invites: invitations,
        referrals
      })
      .pipe(
        map((res) => res),
        catchError(this.handleError('SEND INVITATION', {}))
      );
  }

  /**
   * Update Team from Subject
   * @param _id : Team Id to update
   * @param team : Data to update
   */
  updateTeam$(_id: string, team: Team): void {
    const teams = this.teams.getValue();
    teams.some((e) => {
      if (e._id === _id) {
        e = new Team().deserialize(team);
        return true;
      }
    });
    this.teams.next(teams);
  }
  /**
   * Delete Team from Subject
   * @param _id : Team Id to delete
   */
  deleteTeam$(_id: string): void {
    const teams = this.teams.getValue();
    _.remove(teams, (e) => {
      return e._id === _id;
    });
    this.teams.next(teams);
  }
  /**
   * Insert new team to Subject
   * @param team : New Team Data
   */
  createTeam$(team: Team): void {
    const teams = this.teams.getValue();
    teams.push(team);
    this.teams.next(teams);
  }
  update(id, data): Observable<Team[]> {
    return this.httpClient.put(this.server + TEAM.UPDATE + id, data).pipe(
      map((res) => res['data'] || []),
      catchError(this.handleError('UPDATE TEAM NAME', []))
    );
  }
  delete(id): Observable<Team[]> {
    return this.httpClient.delete(this.server + TEAM.DELETE + id).pipe(
      map((res) => res['data'] || []),
      catchError(this.handleError('DELETE TEAM', []))
    );
  }
  read(id): Observable<Team[]> {
    return this.httpClient.get(this.server + TEAM.READ + id).pipe(
      map((res) => res['data'] || []),
      catchError(this.handleError('READ TEAM', []))
    );
  }
  acceptInvitation(teamId): Observable<any> {
    return this.httpClient.post(
      this.server + TEAM.ACCEPT_INVITATION + teamId,
      {}
    );
  }
  declineInvitation(teamId): Observable<any> {
    return this.httpClient
      .post(this.server + TEAM.DECLINE_INVITATION + teamId, {})
      .pipe(
        map((res) => res['data'] || []),
        catchError(this.handleError('DECLINE TEAM INVITATION', []))
      );
  }
  shareVideos(teamId, videoIds): Observable<any> {
    return this.httpClient
      .post(this.server + TEAM.SHARE_VIDEOS, {
        team_id: teamId,
        video_ids: videoIds
      })
      .pipe(
        map((res) => res['data'] || []),
        catchError(this.handleError('TEAM SHARE VIDEOS', []))
      );
  }
  sharePdfs(teamId, pdfIds): Observable<any> {
    return this.httpClient
      .post(this.server + TEAM.SHARE_PDFS, {
        team_id: teamId,
        pdf_ids: pdfIds
      })
      .pipe(
        map((res) => res['data'] || []),
        catchError(this.handleError('TEAM SHARE PDFS', []))
      );
  }
  shareImages(teamId, imageIds): Observable<any> {
    return this.httpClient
      .post(this.server + TEAM.SHARE_IMAGES, {
        team_id: teamId,
        image_ids: imageIds
      })
      .pipe(
        map((res) => res['data'] || []),
        catchError(this.handleError('TEAM SHARE IMAGES', []))
      );
  }
  shareMaterials(teamId, data): Observable<any> {
    return this.httpClient
      .post(this.server + TEAM.SHARE_MATERIALS, {
        team_id: teamId,
        ...data
      })
      .pipe(
        map((res) => res['data'] || []),
        catchError(this.handleError('TEAM SHARE MATERIALS', []))
      );
  }
  loadSharedContacts(): Observable<any> {
    return this.httpClient.get(this.server + TEAM.LOAD_SHARE_CONTACTS).pipe(
      map((res) => res['data'] || []),
      catchError(this.handleError('TEAM LOAD SHARED CONTACTS', []))
    );
  }
  removeVideo(id): Observable<any> {
    return this.httpClient.post(this.server + TEAM.REMOVE_VIDEO + id, {}).pipe(
      map((res) => res['data'] || []),
      catchError(this.handleError('TEAM REMOVE VIDEO', []))
    );
  }
  removePdf(id): Observable<any> {
    return this.httpClient.post(this.server + TEAM.REMOVE_PDF + id, {}).pipe(
      map((res) => res['data'] || []),
      catchError(this.handleError('TEAM REMOVE PDF', []))
    );
  }
  removeImage(id): Observable<any> {
    return this.httpClient.post(this.server + TEAM.REMOVE_IMAGE + id, {}).pipe(
      map((res) => res['data'] || []),
      catchError(this.handleError('TEAM REMOVE IMAGE', []))
    );
  }
  removeTemplate(id): Observable<any> {
    return this.httpClient
      .post(this.server + TEAM.REMOVE_TEMPLATE + id, {})
      .pipe(
        map((res) => res['data'] || []),
        catchError(this.handleError('TEAM REMOVE TEMPLATE', []))
      );
  }
  updateTeam(teamId, data): Observable<any> {
    return this.httpClient
      .post(this.server + TEAM.UPDATE_TEAM, {
        team_id: teamId,
        data
      })
      .pipe(
        map((res) => res['data'] || []),
        catchError(this.handleError('UPDATE TEAM', []))
      );
  }
  acceptRequest(teamId, memberId): Observable<any> {
    return this.httpClient
      .post(this.server + TEAM.ACCEPT_REQUEST, {
        team_id: teamId,
        request_id: memberId
      })
      .pipe(
        map((res) => res['data'] || []),
        catchError(this.handleError('UPDATE TEAM', []))
      );
  }
  shareTemplates(teamId, templateIds): Observable<any> {
    return this.httpClient
      .post(this.server + TEAM.SHARE_TEMPLATES, {
        team_id: teamId,
        template_ids: templateIds
      })
      .pipe(
        map((res) => res['data'] || []),
        catchError(this.handleError('SHARE TEMPLATES', []))
      );
  }

  shareAutomations(teamId, automationIds): Observable<any> {
    return this.httpClient
      .post(this.server + TEAM.SHARE_AUTOMATIONS, {
        team_id: teamId,
        automation_ids: automationIds
      })
      .pipe(
        map((res) => res['data'] || []),
        catchError(this.handleError('SHARE AUTOMATION', []))
      );
  }

  create(data): Observable<any> {
    return this.httpClient.post(this.server + TEAM.CREATE, data).pipe(
      map((res) => res['data'] || []),
      catchError(this.handleError('CREATE TEAM', []))
    );
  }

  getInquiry(id): Observable<any> {
    return this.httpClient.get(this.server + TEAM.CALL + id).pipe(
      map((res) => res['data'] || []),
      catchError(this.handleError('LOAD INQUIRY CALL', []))
    );
  }
  loadTeamCalls(type: string, skip: number, count: number): Observable<any> {
    return this.httpClient
      .post(this.server + TEAM.TEAM_CALL_LOAD, {
        type,
        skip,
        count
      })
      .pipe(
        map((res) => res),
        catchError(this.handleError('LOAD GROUP CALLS', null))
      );
  }
  getPageInquiries(page): Observable<any> {
    return this.httpClient.get(this.server + TEAM.INQUIRY + page).pipe(
      map((res) => res),
      catchError(this.handleError('LOAD PAGE INQUIRIES CALL', []))
    );
  }
  getPagePlanned(page): Observable<any> {
    return this.httpClient.get(this.server + TEAM.PLANNED + page).pipe(
      map((res) => res),
      catchError(this.handleError('LOAD PAGE PLANNED CALL', []))
    );
  }
  getPageFinished(page): Observable<any> {
    return this.httpClient.get(this.server + TEAM.FINISHED + page).pipe(
      map((res) => res),
      catchError(this.handleError('LOAD PAGE FINISHED CALL', []))
    );
  }
  updateCall(id, data): Observable<TeamCall[]> {
    return this.httpClient.put(this.server + TEAM.UPDATE_CALL + id, data).pipe(
      map((res) => res['status']),
      catchError(this.handleError('UPDATE TEAM CALL'))
    );
  }
  deleteCall(id): Observable<TeamCall[]> {
    return this.httpClient.delete(this.server + TEAM.DELETE_CALL + id).pipe(
      map((res) => res['status']),
      catchError(this.handleError('DELETE TEAM CALL', false))
    );
  }
  requestCall(data): Observable<any> {
    return this.httpClient.post(this.server + TEAM.REQUEST_CALL, data).pipe(
      map((res) => res['data'] || []),
      catchError(this.handleError('REQUEST CALL', []))
    );
  }
  acceptCall(data): Observable<any> {
    return this.httpClient.post(this.server + TEAM.ACCEPT_CALL, data).pipe(
      map((res) => res['data'] || []),
      catchError(this.handleError('ACCEPT CALL', []))
    );
  }
  rejectCall(data): Observable<any> {
    return this.httpClient.post(this.server + TEAM.REJECT_CALL, data).pipe(
      map((res) => res['data'] || []),
      catchError(this.handleError('REJECT CALL', []))
    );
  }

  

  clear$(): void {
    this.teams.next([]);
    this.invites.next([]);
    this.loadStatus.next(STATUS.NONE);
    this.invitesLoadStatus.next(STATUS.NONE);
  }
}
