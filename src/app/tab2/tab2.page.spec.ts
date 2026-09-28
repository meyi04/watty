import { signal } from '@angular/core';
import { StoryService } from '../story.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';

import { Tab2PageModule } from './tab2.module';
import { Tab2Page } from './tab2.page';

describe('Tab2Page', () => {
  let component: Tab2Page;
  let fixture: ComponentFixture<Tab2Page>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [{ provide: StoryService, useValue: { stories: signal([]), loading: signal(false), error: signal('') } }],
      imports: [Tab2PageModule, RouterModule.forRoot([])]
    }).compileComponents();

    fixture = TestBed.createComponent(Tab2Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
