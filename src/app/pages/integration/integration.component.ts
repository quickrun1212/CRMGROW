import { Component, OnInit } from '@angular/core';
import { User } from 'src/app/models/user.model';
import { UserService } from 'src/app/services/user.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-integration',
  templateUrl: './integration.component.html',
  styleUrls: ['./integration.component.scss']
})
export class IntegrationComponent implements OnInit {
  user: User = new User();
  connectingMail = '';

  constructor(private userService: UserService, private toast: ToastrService) {
    this.userService.profile$.subscribe((profile) => {
      this.user = profile;
    });
  }

  ngOnInit(): void {}

  connectMail(type: string): void {
    if (type == 'gmail' || type == 'outlook') {
      this.connectingMail = type;
      this.userService.requestSyncUrl(type).subscribe(
        (res) => {
          if (res['status']) {
            location.href = res['data'];
          }
          this.connectingMail = '';
        },
        (err) => {
          this.connectingMail = '';
          this.showError('Request authorization url Error is happened.');
        }
      );
    } else {
      this.showError(
        'We are improving with the platform with this email Services. So please use another service while we are developing.'
      );
    }
  }

  showError(msg) {
    this.toast.error(msg)
  }
}
