import { signal } from '@angular/core';
import { StoryService } from '../story.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';

import { Tab1PageModule } from './tab1.module';
import { Tab1Page } from './tab1.page';

describe('Tab1Page', () => {
  let component: Tab1Page;
  let fixture: ComponentFixture<Tab1Page>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [{ provide: StoryService, useValue: { stories: signal([]), loading: signal(false), error: signal('') } }],
      imports: [Tab1PageModule, RouterModule.forRoot([])]
    }).compileComponents();

    fixture = TestBed.createComponent(Tab1Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
