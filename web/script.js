// --- CONFIGURATION ---
// 1. MAP
const mapSvg = d3.select("#my_dataviz"),
      mapWidth = +mapSvg.attr("width"),
      mapHeight = +mapSvg.attr("height");

const mapG = mapSvg.append("g");

// 2. BAR CHART AREA
const barSvg = d3.select("#my_barchart"),
      barMargin = {top: 50, right: 110, bottom: 50, left: 50}, 
      barWidth = +barSvg.attr("width") - barMargin.left - barMargin.right,
      barHeight = +barSvg.attr("height") - barMargin.top - barMargin.bottom;

const barG = barSvg.append("g").attr("transform", `translate(${barMargin.left},${barMargin.top})`);

// 3. GLOBAL LINE CHART
const lineSvg = d3.select("#my_linechart"),
      lineMargin = {top: 20, right: 100, bottom: 30, left: 50},
      lineWidth = +lineSvg.attr("width") - lineMargin.left - lineMargin.right,
      lineHeight = +lineSvg.attr("height") - lineMargin.top - lineMargin.bottom;

const lineG = lineSvg.append("g").attr("transform", `translate(${lineMargin.left},${lineMargin.top})`);

// --- ZOOM BEHAVIOR SETUP ---
// Define zoom handler
const zoom = d3.zoom()
    .scaleExtent([1, 8]) // Limit zoom (1x to 8x)
    .on("zoom", (event) => {
        // 1. Apply Transform
        mapG.attr("transform", event.transform);
        
        // 2. Keep stroke width consistent (divide by scale k)
        mapG.selectAll(".country").style("stroke-width", d => {
            // Determine base width
            let base = 0.5;
            if (selectedCountries.includes(d.properties.name)) base = 1.5;
            else if (selectedCountries.length > 0) base = 0.2; // Dim unselected
            
            // Adjust by zoom level
            return (base / event.transform.k) + "px";
        });
    });

// Attach zoom to SVG
mapSvg.call(zoom);

// --- COLORS ---
const categoryColorScale = d3.scaleOrdinal()
    .domain(["Low", "Medium", "High"])
    .range(["#d73027", "#fee090", "#4575b4"]); 

const regionColorScale = d3.scaleOrdinal(d3.schemeTableau10);
let mapColorScale = d3.scaleSequential();
const countryColorScale = d3.scaleOrdinal(d3.schemeCategory10);

// --- STATE VARIABLES ---
let currentYear = 2010;
let currentAttribute = "Life Ladder";
const dataMap = new Map(); 

// DATA STORES
let regionalTrendData = []; 
let worldTrendData = [];    
let fullCountryData = [];   
let geoJsonFeatures = []; 

// INTERACTION STATE
let selectedRegion = null;   
let selectedCategory = null; 
let selectedCountries = []; 

// Metrics Config
const metrics = {
    "Life Ladder": { domain: [1.28, 8.02], scheme: d3.interpolateRdBu },
    "Log GDP per capita": { domain: [5.53, 11.7], scheme: d3.interpolateRdBu },
    "Social support": { domain: [0, 1.0], scheme: d3.interpolateRdBu },
    "Healthy life expectancy at birth": { domain: [6.72, 74.6], scheme: d3.interpolateRdBu },
    "Freedom to make life choices": { domain: [0, 1.0], scheme: d3.interpolateRdBu },
    "Generosity": { domain: [-0.34, 0.7], scheme: d3.interpolateRdBu },
    "Perceptions of corruption": { domain: [0, 1.0], scheme: d3.interpolateRdBu }
};

// Map Projection
const projection = d3.geoMercator()
    .scale(90)
    .center([0, 20])
    .translate([mapWidth / 2, mapHeight / 2]);

const path = d3.geoPath().projection(projection);

// --- INITIALIZATION ---
Promise.all([
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
    d3.csv("../data/regional_averages.csv"),
    d3.csv("../data/world_grouped_by_year.csv"), 
    d3.csv("../data/world_with_regions.csv")      
]).then(function(loadData) {
    const topo = loadData[0];
    geoJsonFeatures = topo.features;
    regionalTrendData = loadData[1];
    worldTrendData = loadData[2];
    fullCountryData = loadData[3];

    // Draw Map
    mapG.selectAll("path")
        .data(topo.features)
        .join("path")
        .attr("d", path)
        .attr("class", "country")
        .attr("fill", "#ccc")
        .on("click", function(event, d) {
            handleCountrySelect(d.properties.name);
            event.stopPropagation();
        })
        .on("mouseover", handleMapMouseOver)
        .on("mousemove", handleMouseMove)
        .on("mouseleave", handleMapMouseLeave);

    // Initial Update
    updateDashboard(currentYear);

    // BACKGROUND CLICK (Reset)
    barSvg.on("click", function(event) {
        if (selectedCountries.length > 0) {
            selectedCountries = []; 
            zoomToCountry(null); 
            updateDashboard(currentYear);
        } else if (selectedRegion) {
            selectedRegion = null;
            selectedCategory = null;
            updateDashboard(currentYear);
        }
    });

    mapSvg.on("click", function(event) {
        // Only trigger reset if we clicked the ocean (SVG), not a country path
        if (event.target.tagName === 'svg') { 
            selectedRegion = null;
            selectedCategory = null;
            selectedCountries = [];
            zoomToCountry(null);
            updateDashboard(currentYear);
        }
    });
});

// --- Handle Country Selection ---
function handleCountrySelect(countryName) {
    const index = selectedCountries.indexOf(countryName);
    
    if (index > -1) {
        selectedCountries.splice(index, 1);
        if (selectedCountries.length > 0) {
            const lastCountry = selectedCountries[selectedCountries.length - 1];
            zoomToCountry(lastCountry);
            const countryData = fullCountryData.find(d => d.country_geo === lastCountry);
            if (countryData) selectedRegion = countryData.region;
        } else {
            zoomToCountry(null);
        }
    } else {
        selectedCountries.push(countryName);
        const countryData = fullCountryData.find(d => d.country_geo === countryName);
        if (countryData) selectedRegion = countryData.region;
        zoomToCountry(countryName);
    }
    updateDashboard(currentYear);
}

// --- ZOOM FUNCTION (UPDATED) ---
function zoomToCountry(countryName) {
    if (!countryName) {
        // Reset to default (Identity)
        mapSvg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
        return;
    }

    const d = geoJsonFeatures.find(f => f.properties.name === countryName);
    if (!d) return;

    // Calculate Bounds
    const bounds = path.bounds(d),
          dx = bounds[1][0] - bounds[0][0],
          dy = bounds[1][1] - bounds[0][1],
          x = (bounds[0][0] + bounds[1][0]) / 2,
          y = (bounds[0][1] + bounds[1][1]) / 2,
          // Cap zoom at 8x to match scaleExtent
          scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / mapWidth, dy / mapHeight))),
          translate = [mapWidth / 2 - scale * x, mapHeight / 2 - scale * y];

    // Create D3 Transform Object
    const transform = d3.zoomIdentity
        .translate(translate[0], translate[1])
        .scale(scale);

    // Apply Transform via Zoom Behavior (Updates internal state + triggers 'zoom' event)
    mapSvg.transition()
        .duration(750)
        .call(zoom.transform, transform);
}

// --- MAIN CONTROLLER ---
function updateDashboard(year) {
    updateLineChartVisuals();

    const fileName = `../data/yearly_files/world_${year}.csv`;
    d3.csv(fileName).then(function(data) {
        dataMap.clear();
        data.forEach(d => {
            if (d[currentAttribute]) dataMap.set(d.country_geo, +d[currentAttribute]);
        });
        updateMapVisuals();

        if (selectedCountries.length > 0) {
            drawCountryTrendChart();
        } else if (selectedRegion && selectedCategory) {
            drawTopCountriesBars(data); 
        } else {
            drawRegionalStacks(data);
        }
    }).catch(err => {
        console.warn(`Data for ${year} missing`, err);
    });
}

function updateMapVisuals() {
    const config = metrics[currentAttribute];
    mapColorScale.interpolator(config.scheme).domain(config.domain);
    
    // Get current zoom level to maintain stroke width
    const currentZoom = d3.zoomTransform(mapSvg.node()).k || 1;

    mapG.selectAll(".country")
        .transition().duration(500)
        .attr("fill", d => {
            const val = dataMap.get(d.properties.name);
            return (val === undefined) ? "#ccc" : mapColorScale(val);
        })
        .style("stroke", d => selectedCountries.includes(d.properties.name) ? "black" : "white")
        // Dynamically adjust stroke width based on zoom level
        .style("stroke-width", d => {
            let base = 0.5;
            if (selectedCountries.includes(d.properties.name)) base = 1.5;
            else if (selectedCountries.length > 0) base = 0.2;
            return (base / currentZoom) + "px";
        });
}

// --- VIEW 1: REGIONAL STACKS ---
function drawRegionalStacks(data) {
    d3.select("#barLegend").style("opacity", 1).style("display", "block");
    barG.selectAll("*").remove();
    
    barG.append("text").attr("x", barWidth/2).attr("y", -20).attr("text-anchor", "middle")
        .style("font-size", "20px").style("font-weight", "bold")
        .text(`Regional Happiness Distribution (${currentYear})`);

    const regions = Array.from(new Set(data.map(d => d.region).filter(r => r))).sort();
    const regionCounts = regions.map(region => {
        const rows = data.filter(d => d.region === region);
        const counts = { region, Low: 0, Medium: 0, High: 0, total: 0 };
        rows.forEach(d => {
            if (counts[d["Life Ladder Category"]] !== undefined) {
                counts[d["Life Ladder Category"]]++;
                counts.total++;
            }
        });
        return counts;
    });

    const stackedData = d3.stack().keys(["Low", "Medium", "High"])(regionCounts);

    const x = d3.scaleBand().domain(regions).range([0, barWidth]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(regionCounts, d => d.total) || 10]).range([barHeight, 0]);

    barG.append("g").attr("transform", `translate(0,${barHeight})`)
        .call(d3.axisBottom(x)).selectAll("text")
        .attr("transform", "translate(+10,0)rotate(-30)").style("text-anchor", "end");
    barG.append("g").call(d3.axisLeft(y));

    barG.selectAll(".layer").data(stackedData).join("g").attr("fill", d => categoryColorScale(d.key))
        .selectAll("rect").data(d => d).join("rect")
            .attr("x", d => x(d.data.region)).attr("y", d => y(d[1]))
            .attr("height", d => y(d[0]) - y(d[1])).attr("width", x.bandwidth())
            .attr("cursor", "pointer")
            .on("click", (event, d) => {
                event.stopPropagation();
                selectedCategory = d3.select(event.target.parentNode).datum().key;
                selectedRegion = d.data.region;
                updateDashboard(currentYear);
            });
}

// --- VIEW 2: TOP 5 COUNTRIES ---
function drawTopCountriesBars(data) {
    d3.select("#barLegend").style("opacity", 1).style("display", "block");
    barG.selectAll("*").remove();
    
    const filtered = data.filter(d => d.region === selectedRegion && d["Life Ladder Category"] === selectedCategory);
    filtered.sort((a,b) => +b["Life Ladder"] - +a["Life Ladder"]);
    const top5 = filtered.slice(0, 5);

    barG.append("text").attr("x", barWidth/2).attr("y", -20).attr("text-anchor", "middle")
        .style("font-size", "20px").style("font-weight", "bold")
        .html(`Top 5 '${selectedCategory}' in ${selectedRegion} <tspan fill="blue" style="font-weight:normal; cursor:pointer; font-size:14px">(Click BG to Back)</tspan>`);

    const x = d3.scaleBand().domain(top5.map(d => d.country_geo)).range([0, barWidth]).padding(0.4);
    const y = d3.scaleLinear().domain([0, 8]).range([barHeight, 0]);

    barG.append("g").attr("transform", `translate(0,${barHeight})`).call(d3.axisBottom(x));
    barG.append("g").call(d3.axisLeft(y));

    barG.selectAll("rect").data(top5).join("rect")
        .attr("x", d => x(d.country_geo)).attr("y", d => y(+d["Life Ladder"]))
        .attr("width", x.bandwidth()).attr("height", d => barHeight - y(+d["Life Ladder"]))
        .attr("fill", categoryColorScale(selectedCategory)).attr("cursor", "pointer")
        .on("click", (event, d) => {
            event.stopPropagation();
            handleCountrySelect(d.country_geo);
        });
}

// --- VIEW 3: COUNTRY COMPARISON TREND (MULTI-SELECT) ---
function drawCountryTrendChart() {
    d3.select("#barLegend").style("opacity", 0).style("display", "none");
    barG.selectAll("*").remove();

    const focusCountry = selectedCountries[selectedCountries.length - 1];
    const countryInfo = fullCountryData.find(d => d.country_geo === focusCountry);
    const regionName = countryInfo ? countryInfo.region : null;

    const regionData = regionalTrendData
        .filter(d => d.region === regionName)
        .filter(d => +d.year <= +currentYear);

    const worldData = worldTrendData.filter(d => +d.year <= +currentYear);

    barG.append("text").attr("x", barWidth/2).attr("y", -25).attr("text-anchor", "middle")
        .style("font-size", "20px").style("font-weight", "bold")
        .text(`Comparison: ${selectedCountries.join(", ")} vs ${regionName}`);
    
    barG.append("text").attr("x", barWidth/2).attr("y", -8).attr("text-anchor", "middle")
        .style("font-size", "14px").attr("fill", "#666")
        .text(`Metric: ${currentAttribute} (2010 - ${currentYear})`);

    const x = d3.scaleLinear().domain([2010, 2023]).range([0, barWidth]);
    const domainConfig = metrics[currentAttribute].domain;
    const y = d3.scaleLinear()
        .domain([Math.min(...domainConfig), Math.max(...domainConfig)])
        .range([barHeight, 0]);

    barG.append("g").attr("transform", `translate(0,${barHeight})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));
    barG.append("g").call(d3.axisLeft(y));

    const lineGen = d3.line()
        .x(d => x(+d.year))
        .y(d => y(+d[currentAttribute]))
        .defined(d => !isNaN(d[currentAttribute]) && d[currentAttribute] !== "");

    function drawLineAndDots(data, color, dash, name, isBold) {
        if (!data || data.length === 0) return;

        barG.append("path")
            .datum(data)
            .attr("fill", "none").attr("stroke", color)
            .attr("stroke-width", isBold ? 3 : 2)
            .attr("stroke-dasharray", dash).attr("d", lineGen);

        barG.selectAll(`.dot-${name.replace(/[^a-zA-Z0-9]/g,'')}`)
            .data(data).join("circle")
            .attr("cx", d => x(+d.year)).attr("cy", d => y(+d[currentAttribute]))
            .attr("r", 4).attr("fill", color).attr("stroke", "#fff").attr("stroke-width", 1)
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                d3.select(this).attr("r", 6).attr("stroke", "#000");
                const val = (+d[currentAttribute]).toFixed(2);
                showTooltip(event, `<strong>${name} (${d.year})</strong><br/>${val}`);
            })
            .on("mousemove", handleMouseMove)
            .on("mouseleave", function() {
                d3.select(this).attr("r", 4).attr("stroke", "#fff");
                hideTooltip();
            });
    }

    drawLineAndDots(worldData, "#999", "4,4", "World Avg", false);
    if (regionName) drawLineAndDots(regionData, "#ff7f0e", "8,4", regionName, false);

    selectedCountries.forEach((country, index) => {
        const cData = fullCountryData
            .filter(d => d.country_geo === country)
            .filter(d => +d.year <= +currentYear);
        const color = countryColorScale(index);
        drawLineAndDots(cData, color, "0", country, true);
    });

    const legend = barG.append("g").attr("transform", `translate(${barWidth + 15}, 0)`);
    let legendItems = [
        {color: "#999", text: "World Avg"},
        {color: "#ff7f0e", text: `${regionName} Avg`}
    ];
    selectedCountries.forEach((c, i) => {
        legendItems.push({color: countryColorScale(i), text: c});
    });

    legendItems.forEach((item, i) => {
        const row = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
        row.append("rect").attr("width", 10).attr("height", 10).attr("fill", item.color);
        row.append("text").attr("x", 15).attr("y", 10).text(item.text)
           .style("font-size", "12px").attr("alignment-baseline", "middle");
    });
}

// --- GLOBAL LINE CHART ---
function updateLineChartVisuals() {
    const dataFiltered = regionalTrendData.filter(d => +d.year <= +currentYear);
    const sumstat = d3.group(dataFiltered, d => d.region);
    
    const x = d3.scaleLinear().domain([2010, 2023]).range([0, lineWidth]);
    const domainConfig = metrics[currentAttribute].domain;
    const y = d3.scaleLinear().domain([Math.min(...domainConfig), Math.max(...domainConfig)]).range([lineHeight, 0]);

    lineG.selectAll("*").remove(); 
    lineG.append("g").attr("transform", `translate(0,${lineHeight})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
    lineG.append("g").call(d3.axisLeft(y));

    lineG.selectAll(".line").data(sumstat).join("path")
        .attr("class", "line").attr("fill", "none")
        .attr("stroke", d => regionColorScale(d[0])).attr("stroke-width", 2)
        .attr("d", d => d3.line().x(d => x(+d.year)).y(d => y(+d[currentAttribute]))(d[1]));
    
    lineG.selectAll(".region-dots").data(dataFiltered).join("circle")
        .attr("cx", d => x(+d.year)).attr("cy", d => y(+d[currentAttribute]))
        .attr("r", 3).attr("fill", d => regionColorScale(d.region))
        .on("mouseover", function(event, d) {
             d3.select(this).attr("r", 6).attr("stroke", "black");
             showTooltip(event, `<strong>${d.region}</strong><br/>${(+d[currentAttribute]).toFixed(2)}`);
        })
        .on("mousemove", handleMouseMove)
        .on("mouseleave", function() {
            d3.select(this).attr("r", 3).attr("stroke", "none");
            hideTooltip();
        });

    const regions = Array.from(sumstat.keys()).sort();
    const legend = lineG.selectAll(".legend-item").data(regions).enter().append("g")
        .attr("transform", (d,i) => `translate(${lineWidth+10}, ${i*15})`);
    legend.append("rect").attr("width", 10).attr("height", 10).attr("fill", d => regionColorScale(d));
    legend.append("text").attr("x", 15).attr("y", 10).text(d => d).style("font-size", "10px");
}

// --- EVENTS ---
d3.select("#attributeSelect").on("change", function() { currentAttribute = this.value; updateDashboard(currentYear); });
d3.select("#yearSlider").on("input", function() { currentYear = this.value; d3.select("#yearLabel").text(currentYear); updateDashboard(currentYear); });
function showTooltip(event, html) {
    d3.select("#tooltip").style("opacity", 1).html(html)
        .style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
}
function hideTooltip() { d3.select("#tooltip").style("opacity", 0); }
function handleMouseMove(event) { d3.select("#tooltip").style("left", (event.pageX+10)+"px").style("top", (event.pageY-28)+"px"); }
function handleMapMouseOver(event, d) {
    const val = dataMap.get(d.properties.name);
    showTooltip(event, `<strong>${d.properties.name}</strong><br/>${val ? val.toFixed(2) : "No Data"}`);
    d3.select(this).style("stroke", "black");
}
function handleMapMouseLeave() { hideTooltip(); d3.select(this).style("stroke", "white"); }