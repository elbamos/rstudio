/*
 * MemUsageWidget.java
 *
 * Copyright (C) 2021 by RStudio, PBC
 *
 * Unless you have received this program directly from RStudio pursuant
 * to the terms of a commercial license agreement with RStudio, then
 * this program is licensed to you under the terms of version 3 of the
 * GNU Affero General Public License. This program is distributed WITHOUT
 * ANY EXPRESS OR IMPLIED WARRANTY, INCLUDING THOSE OF NON-INFRINGEMENT,
 * MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE. Please refer to the
 * AGPL (http://www.gnu.org/licenses/agpl-3.0.txt) for more details.
 *
 */
package org.rstudio.studio.client.workbench.views.environment.view;

import com.google.gwt.dom.client.Style;
import com.google.gwt.i18n.client.NumberFormat;
import com.google.gwt.resources.client.ImageResource;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.HTMLPanel;
import org.rstudio.core.client.widget.MiniPieWidget;
import org.rstudio.core.client.widget.ToolbarButton;
import org.rstudio.core.client.widget.ToolbarMenuButton;
import org.rstudio.core.client.widget.ToolbarPopupMenu;
import org.rstudio.core.client.widget.UserPrefMenuItem;
import org.rstudio.studio.client.RStudioGinjector;
import org.rstudio.studio.client.workbench.prefs.model.UserPrefs;
import org.rstudio.studio.client.workbench.views.environment.model.MemoryUsage;

public class MemUsageWidget extends Composite
{
   public MemUsageWidget(MemoryUsage usage, UserPrefs prefs)
   {
      prefs_ = prefs;

      host_ = new HTMLPanel("");
      Style style = host_.getElement().getStyle();
      style.setProperty("display", "flex");
      style.setProperty("flexDirection", "row");

      pieCrust_ = new HTMLPanel("");
      pieCrust_.setHeight("13px");
      pieCrust_.setWidth("13px");
      style = pieCrust_.getElement().getStyle();
      style.setMarginTop(3, Style.Unit.PX);
      style.setMarginRight(3, Style.Unit.PX);
      host_.add(pieCrust_);

      ToolbarPopupMenu memoryMenu = new ToolbarPopupMenu();
      memoryMenu.addItem(RStudioGinjector.INSTANCE.getCommands().freeUnusedMemory().createMenuItem(false));
      memoryMenu.addSeparator();
      memoryMenu.addItem(new UserPrefMenuItem<Boolean>(
         prefs_.showMemoryUsage(),
         true,
         "Show Current Memory Usage",
         prefs_
      ));

      menu_ = new ToolbarMenuButton(
         "Memory",
         ToolbarButton.NoTitle,
         (ImageResource) null,
         memoryMenu);
      menu_.getElement().getStyle().setMarginTop(-3, Style.Unit.PX);
      host_.add(menu_);

      setMemoryUsage(usage);

      prefs.showMemoryUsage().addValueChangeHandler(evt ->
      {
         // Clear memory usage display immediately when turned off
         if (!evt.getValue())
         {
            setMemoryUsage(null);
         }
      });

      initWidget(host_);
   }

   public void setMemoryUsage(MemoryUsage usage)
   {
      if (usage == null)
      {
         pieCrust_.getElement().removeAllChildren();
         menu_.setText("Memory");
      }
      else
      {
         long percent = Math.round(((usage.getUsed().getKb() * 1.0) / (usage.getTotal().getKb() * 1.0)) * 100);
         menu_.setTitle("Memory used by R session");
         menu_.setText(formatBigMemory(usage.getProcess().getKb()));

         // These values are chosen to align with those used in rstudio.cloud.
         String color = "#5f9a91";   // under 70%, green
         if (percent > 90) {
            color = "#e55037";       // 90% and above, red
         } else if (percent > 80) {
            color = "#e58537";       // 80-90%, orange
         } else if (percent > 70) {
            color = "#fcbf49";       // 70-80%, yellow
         }

         // For browser SVG painting reasons, it is necessary to create a wholly
         // new SVG element and then replay it as HTML into the DOM to get it to 
         // draw correctly.
         MiniPieWidget pie = new MiniPieWidget(
            "Memory in use: " + percent + "% of " + 
               formatBigMemory(usage.getTotal().getKb()) + 
               " (source: " + usage.getTotal().getProviderName() + ")",
            "Pie chart depicting the percentage of total memory in use", 
            color, 
            "#e4e4e4", 
            (int)percent);
         pieCrust_.getElement().removeAllChildren();
         pieCrust_.add(pie);
         pieCrust_.getElement().setInnerHTML(pieCrust_.getElement().getInnerHTML());
      }
   }
   
   private String formatBigMemory(int kb)
   {
      long mib = kb / 1024;
      if (mib >= 1024)
      {
         // Memory usage is > 1GiB, format as XX.YY GiB
         NumberFormat decimalFormat = NumberFormat.getFormat(".##");
         return decimalFormat.format((double)mib / (double)1024) + " GiB";
      }

      // Memory usage is in MiB
      return mib + " MiB";
   }

   private final UserPrefs prefs_;
   private final HTMLPanel pieCrust_;
   private final ToolbarMenuButton menu_;
   private final HTMLPanel host_;
}
