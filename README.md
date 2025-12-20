# World Trends Dashboard (2010–2023)

<img width="2026" height="1451" alt="image" src="https://github.com/user-attachments/assets/1c54c1af-3dfc-4b77-9598-7d54977ec2bc" />


## 📖 Overview

The **World Trends Dashboard** is an interactive data visualization project built with **D3.js**. It explores the "World Happiness Report" data over the last decade, allowing users to analyze how Happiness ("Life Ladder") correlates with economic factors, social support, and geography.

The dashboard moves beyond static reporting by offering linked views, semantic zooming, and multi-country comparisons to uncover deep insights into global well-being.

## ✨ Key Features

### 1. Interactive Choropleth Map

* **Geospatial Analysis:** Visualizes metrics across the globe using the **Viridis** color scale (perceptually uniform and color-blind safe).
* **Interactions:** Hover effects with "pop-out" shadows, tooltips, and geometric zooming/panning.
* **Linked Selection:** Clicking a country on the map updates all other charts to focus on that specific country.

### 2. Regional Analysis (Stacked Bar Chart)

* **Distribution View:** Shows the breakdown of happiness categories (Low, Medium, High) per region.
* **Drill-Down Capability:** Clicking a region's bar drills down to show the **Top 5 Countries** for that specific category and region.
* **Color Safety:** Uses the **Okabe-Ito** palette for categorical data to ensure accessibility for deuteranopia and protanopia.

### 3. Time Series Trends (Multi-Line Chart)

* **Contextual Comparison:** When a country is selected, the chart plots its trend against the **Regional Average** and **World Average**.
* **Multi-Select:** Users can click multiple countries on the map to compare their trends simultaneously.
* **Animation:** Lines grow dynamically as the time slider is moved.

### 4. Advanced Controls

* **Time Slider:** Animates the data changes from 2010 to 2023.
* **Metric Selector:** Switch between different datasets (Log GDP, Social Support, Freedom, Corruption, etc.).

---

## 🛠️ Technology Stack

* **Frontend:** HTML5, CSS3, JavaScript (ES6+)
* **Visualization Library:** [D3.js v7](https://d3js.org/)
* **Data Processing:** Python (Pandas, NumPy)
* **Styling:** CSS Grid/Flexbox, CSS Filters (Drop-shadows), Backdrop Filters.

---

## 🚀 How to Run

Because this project loads external data files (`.csv` and `.json`) using D3, **it cannot be run by simply opening `index.html` in a browser** due to CORS (Cross-Origin Resource Sharing) security policies. You must run a local server.

### Using VS Code (Recommended)

1. Install the **Live Server** extension for VS Code.
2. Right-click `index.html` and select **"Open with Live Server"**.

---

## 🐍 Data Pipeline

The raw data contained gaps and inconsistencies. A Python pipeline was created to ensure visualization stability:

1. **Filtering:** Restricted data to the years 2010–2023.
2. **Cleaning:** Removed countries with fewer than 7 records to ensure reliable trend lines.
3. **Imputation:** Used **Linear Interpolation** to fill missing yearly values, ensuring smooth animations without "flickering" lines.
4. **Region Mapping:** Standardized country names (to match GeoJSON) and grouped them into 5 macro-regions (Africa, Americas, Asia, Europe, Oceania).
5. **Export:** Generated optimized CSVs for the frontend to load quickly.

---

## 🎨 Design & Accessibility

* **Color Blindness:** We moved away from Red/Green scales.
* **Continuous Data:** Uses `d3.interpolateViridis`, which is viewable by all forms of color blindness.
* **Categorical Data:** Uses a modified Vermilion/Yellow/Blue scale.
* **Cognitive Load:** The dashboard follows the "Overview first, zoom and filter, then details-on-demand" mantra (Shneiderman).
* **Transitions:** All updates use `d3.easeCubicOut` for fluid, organic motion, helping the user track changes without visual jarring.

---

## 📄 License

This project is for educational purposes. Data is sourced from the [World Happiness Report](https://www.kaggle.com/datasets/abdullah0a/world-happiness-data-2024-explore-life).
