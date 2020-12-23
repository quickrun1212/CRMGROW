import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { STATISTICS_DURATION } from 'src/app/constants/variable.constants';
import { TabItem } from 'src/app/utils/data.types';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  STATISTICS_DURATION = STATISTICS_DURATION;
  tabs: TabItem[] = [
    { icon: 'i-icon i-task', label: 'Tasks', id: 'tasks' },
    { icon: 'i-icon i-notification', label: 'Activity', id: 'activities' }
  ];
  DEADLINE_TYPES = [
    { id: 'all', label: 'All tasks' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'today', label: 'Today' },
    { id: 'tomorrow', label: 'Tomorrow' },
    { id: 'this week', label: 'This week' },
    { id: 'next week', label: 'Next week' }
  ];

  selectedTab: TabItem = this.tabs[0];
  // Statistics
  duration = STATISTICS_DURATION[0];
  // Task Filter Type
  deadline = this.DEADLINE_TYPES[0];

  constructor(private location: Location) {}

  ngOnInit(): void {
    // Load the Last Tab Variable from Storage
    const page = localStorage.getItem('homeTab');
    if (page === 'activities') {
      this.selectedTab = this.tabs[1];
    }
  }

  /**
   * Change the Tab -> This will change the view
   * @param tab : TabItem for the Task and Activity
   */
  changeTab(tab: TabItem): void {
    this.selectedTab = tab;
    this.location.replaceState(tab.id);
    // Set the storage for the active tab
    localStorage.setItem('homeTab', tab.id);
  }
  /**
   * Change Duration
   * @param value : Duration Value -> monthly | weekly | yearly
   */
  changeDuration(value: string): void {
    this.duration = value;
  }
  /**
   * Change the Task Deadline
   * @param value : Deadline Type -> {label: '', id: ''}
   */
  changeDeadlineType(value: any): void {
    this.deadline = value;
  }
  /**
   * Open Filter Panel
   */
  openFilter(): void {}

  //////////////////// analytics page ////////////////////
  analyticsTabs: TabItem[] = [
    { icon: 'i-icon i-video', label: 'Video Sent', id: 'video-sent' },
    {
      icon: 'i-icon i-notification',
      label: 'Video watched',
      id: 'video-watched'
    },
    {
      icon: 'i-icon i-group-call',
      label: 'Contacts Added',
      id: 'contacts-added'
    }
  ];

  selectedAnalyticsTab: TabItem = this.analyticsTabs[0];

  changeAnalyticsTab(tab: TabItem): void {
    this.selectedAnalyticsTab = tab;
  }
}
