import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { interval, Observable } from 'rxjs';
import {
  catchError,
  filter,
  map,
  takeUntil,
  scan,
  withLatestFrom,
  tap,
  repeat,
  combineAll
} from 'rxjs/operators';
import { VIDEO, PDF, IMAGE } from '../constants/api.constant';
import { Image } from '../models/image.model';
import { Pdf } from '../models/pdf.model';
import { Video } from '../models/video.model';
import { ErrorService } from './error.service';
import { HttpService } from './http.service';
import { StoreService } from './store.service';

@Injectable({
  providedIn: 'root'
})
export class MaterialService extends HttpService {
  constructor(
    errorService: ErrorService,
    private httpClient: HttpClient,
    private storeService: StoreService
  ) {
    super(errorService);
  }

  loadVideosImpl(): Observable<Video[]> {
    return this.httpClient.get(this.server + VIDEO.LOAD).pipe(
      map((res) => res['data'] || []),
      catchError(this.handleError('LOAD VIDEOS', []))
    );
  }
  loadPdfsImpl(): Observable<Pdf[]> {
    return this.httpClient.get(this.server + PDF.CREATE).pipe(
      map((res) => res['data'] || []),
      catchError(this.handleError('LOAD PDFS', []))
    );
  }
  loadImagesImpl(): Observable<Image[]> {
    return this.httpClient.get(this.server + IMAGE.CREATE).pipe(
      map((res) => res['data'] || []),
      catchError(this.handleError('LOAD IMAGES', []))
    );
  }
  loadVideos(): void {
    this.loadVideosImpl().subscribe((videos) => {
      this.storeService.videos.next(videos);
    });
  }
  loadPdfs(): void {
    this.loadPdfsImpl().subscribe((pdfs) => {
      this.storeService.pdfs.next(pdfs);
    });
  }
  loadImages(): void {
    this.loadImagesImpl().subscribe((images) => {
      this.storeService.images.next(images);
    });
  }
}
