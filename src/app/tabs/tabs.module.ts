import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TabsPageRoutingModule } from './tabs-routing.module';

import { TabsPage } from './tabs.page';
import {ThreeJsDemoComponent} from "../components/three-js-demo/three-js-demo.component";

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    TabsPageRoutingModule
  ],
  exports: [
    ThreeJsDemoComponent
  ],
  declarations: [TabsPage, ThreeJsDemoComponent]
})
export class TabsPageModule {}
