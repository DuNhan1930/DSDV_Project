// --- CONFIGURATION ---
// 1. MAP
const mapSvg = d3.select("#my_dataviz"),
      mapWidth = +mapSvg.attr("width"),
      mapHeight = +mapSvg.attr("height");

const mapG = mapSvg.append("g");

// --- MAP LEGEND SETUP ---
// Create a group for the legend, positioned bottom-left
const mapLegendG = mapSvg.append("g")
    .attr("class", "map-legend")
    .attr("transform", `translate(20, ${mapHeight - 50})`); // Position: Bottom Left

// Define the Gradient (Viridis) once
const defs = mapSvg.append("defs");
const linearGradient = defs.append("linearGradient")
    .attr("id", "map-gradient")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "100%").attr("y2", "0%");

// Add stops to the gradient (0% to 100% of the Viridis scale)
linearGradient.selectAll("stop")
    .data([
        {offset: "0%", color: d3.interpolateViridis(0)},
        {offset: "25%", color: d3.interpolateViridis(0.25)},
        {offset: "50%", color: d3.interpolateViridis(0.5)},
        {offset: "75%", color: d3.interpolateViridis(0.75)},
        {offset: "100%", color: d3.interpolateViridis(1)}
    ])
    .enter().append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color);

// Draw the Rectangle that uses the gradient
mapLegendG.append("rect")
    .attr("width", 200)
    .attr("height", 12)
    .style("fill", "url(#map-gradient)")
    .style("stroke", "#ccc")
    .style("stroke-width", "0.5px");

// Add a group for the Axis (Numbers)
const mapLegendAxisG = mapLegendG.append("g")
    .attr("transform", "translate(0, 12)");

// 2. BAR CHART AREA
const barSvg = d3.select("#my_barchart"),
      barMargin = {top: 50, right: 120, bottom: 50, left: 50}, 
      barWidth = +barSvg.attr("width") - barMargin.left - barMargin.right,
      barHeight = +barSvg.attr("height") - barMargin.top - barMargin.bottom;

const barG = barSvg.append("g").attr("transform", `translate(${barMargin.left},${barMargin.top})`);

// 3. GLOBAL LINE CHART
const lineSvg = d3.select("#my_linechart"),
      lineMargin = {top: 20, right: 100, bottom: 30, left: 50},
      lineWidth = +lineSvg.attr("width") - lineMargin.left - lineMargin.right,
      lineHeight = +lineSvg.attr("height") - lineMargin.top - lineMargin.bottom;

const lineG = lineSvg.append("g").attr("transform", `translate(${lineMargin.left},${lineMargin.top})`);

// --- COLORS ---
const categoryColorScale = d3.scaleOrdinal()
    .domain(["Low", "Medium", "High"])
    .range(["#D55E00", "#E69F00", "#56B4E9"]); // Okabe-Ito (Color Blind Safe)

const regionColorScale = d3.scaleOrdinal(d3.schemeTableau10);
let mapColorScale = d3.scaleSequential();
const countryColorScale = d3.scaleOrdinal(d3.schemeCategory10);

// --- ZOOM BEHAVIOR ---
const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", (event) => {
        mapG.attr("transform", event.transform);
        mapG.selectAll(".country").style("stroke-width", d => {
            let base = 0.5;
            if (selectedCountries.includes(d.properties.name)) base = 1.5;
            return (base / event.transform.k) + "px";
        });
    });
mapSvg.call(zoom);

// --- STATE VARIABLES ---
let currentYear = 2010;
let currentAttribute = "Life Ladder";
const dataMap = new Map(); 

let regionalTrendData = []; 
let worldTrendData = [];    
let fullCountryData = [];   
let geoJsonFeatures = []; 

let selectedRegion = null;   
let selectedCategory = null; 
let selectedCountries = []; 

// Metrics Config (Viridis for Accessibility)
const colorScheme = d3.interpolateViridis; 
const metrics = {
    "Life Ladder": { domain: [1.28, 8.02], scheme: colorScheme },
    "Log GDP per capita": { domain: [5.53, 11.7], scheme: colorScheme },
    "Social support": { domain: [0, 1.0], scheme: colorScheme },
    "Healthy life expectancy at birth": { domain: [40, 76], scheme: colorScheme },
    "Freedom to make life choices": { domain: [0, 1.0], scheme: colorScheme },
    "Generosity": { domain: [-0.34, 0.7], scheme: colorScheme },
    "Perceptions of corruption": { domain: [0, 1.0], scheme: colorScheme }
};

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

    // Draw Map Geometry
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

    updateDashboard(currentYear);

    // BACKGROUND CLICK
    barSvg.on("click", function() {
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
        if (event.target.tagName === 'svg') { 
            selectedRegion = null;
            selectedCategory = null;
            selectedCountries = [];
            zoomToCountry(null);
            updateDashboard(currentYear);
        }
    });
});

// --- INTERACTIONS ---
function handleCountrySelect(countryName) {
    const index = selectedCountries.indexOf(countryName);
    if (index > -1) {
        selectedCountries.splice(index, 1);
        if (selectedCountries.length > 0) {
            const lastCountry = selectedCountries[selectedCountries.length - 1];
            zoomToCountry(lastCountry);
            const cData = fullCountryData.find(d => d.country_geo === lastCountry);
            if(cData) selectedRegion = cData.region;
        } else {
            zoomToCountry(null);
        }
    } else {
        selectedCountries.push(countryName);
        const cData = fullCountryData.find(d => d.country_geo === countryName);
        if(cData) selectedRegion = cData.region;
        zoomToCountry(countryName);
    }
    updateDashboard(currentYear);
}

function zoomToCountry(countryName) {
    if (!countryName) {
        mapSvg.transition().duration(1000).ease(d3.easeCubicOut)
            .call(zoom.transform, d3.zoomIdentity);
        return;
    }
    const d = geoJsonFeatures.find(f => f.properties.name === countryName);
    if (!d) return;

    const bounds = path.bounds(d),
          dx = bounds[1][0] - bounds[0][0],
          dy = bounds[1][1] - bounds[0][1],
          x = (bounds[0][0] + bounds[1][0]) / 2,
          y = (bounds[0][1] + bounds[1][1]) / 2,
          scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / mapWidth, dy / mapHeight))),
          translate = [mapWidth / 2 - scale * x, mapHeight / 2 - scale * y];

    const transform = d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale);

    mapSvg.transition().duration(1000).ease(d3.easeCubicOut)
        .call(zoom.transform, transform);
}

// --- UPDATE DASHBOARD ---
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
    }).catch(err => console.warn(err));
}

function updateMapVisuals() {
    const config = metrics[currentAttribute];
    mapColorScale.interpolator(config.scheme).domain(config.domain);
    
    // 1. Update Map Colors (Smooth)
    mapG.selectAll(".country")
        .transition().duration(750).ease(d3.easeCubicOut)
        .attr("fill", d => {
            const val = dataMap.get(d.properties.name);
            return (val === undefined) ? "#e0e0e0" : mapColorScale(val);
        })
        .style("stroke", d => selectedCountries.includes(d.properties.name) ? "#222" : "white");

    // 2. Update Map Legend
    updateMapLegend(config.domain);
}

// --- NEW LEGEND UPDATE FUNCTION ---
function updateMapLegend(domain) {
    // Update Scale for Legend Axis
    const legendScale = d3.scaleLinear()
        .domain(domain)
        .range([0, 200]);

    // Define Axis
    const legendAxis = d3.axisBottom(legendScale)
        .ticks(5)
        .tickSize(4)
        .tickFormat(d3.format(".1f")); // 1 decimal place

    // Render/Update Axis
    mapLegendAxisG.transition().duration(750).call(legendAxis);

    // Update Label text if needed
    // (Optional: Add a label above the legend)
    mapLegendG.selectAll(".legend-label").remove();
    mapLegendG.append("text")
        .attr("class", "legend-label")
        .attr("x", 0)
        .attr("y", -6)
        .style("font-size", "11px")
        .style("fill", "#666")
        .text(currentAttribute);
}

// --- BAR CHART VIEWS ---

function drawRegionalStacks(data) {
    d3.select("#barLegend").style("display", "block").style("opacity", 1);
    barG.selectAll("*").remove(); 

    barG.append("text").attr("x", barWidth/2).attr("y", -20).attr("text-anchor", "middle")
        .style("font-size", "20px").style("font-weight", "bold").style("fill", "#333")
        .text(`Regional Happiness (${currentYear})`);

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
        .attr("transform", "translate(-10,0)rotate(-45)").style("text-anchor", "end");
    barG.append("g").call(d3.axisLeft(y));

    barG.selectAll(".layer").data(stackedData).join("g").attr("fill", d => categoryColorScale(d.key))
        .selectAll("rect").data(d => d).join("rect")
            .attr("x", d => x(d.data.region))
            .attr("width", x.bandwidth())
            .attr("y", barHeight)
            .attr("height", 0)
            .attr("cursor", "pointer")
            .on("click", (event, d) => {
                event.stopPropagation();
                selectedCategory = d3.select(event.target.parentNode).datum().key;
                selectedRegion = d.data.region;
                updateDashboard(currentYear);
            })
            .on("mouseover", function(event, d) {
                 const subgroupName = d3.select(this.parentNode).datum().key;
                 d3.select(this).style("opacity", 1);
                 showTooltip(event, `<strong>${d.data.region}</strong><br/>${subgroupName}: ${d.data[subgroupName]}`);
            })
            .on("mousemove", handleMouseMove)
            .on("mouseleave", function() {
                d3.select(this).style("opacity", 1);
                hideTooltip();
            })
            .transition().duration(750).ease(d3.easeCubicOut)
            .attr("y", d => y(d[1]))
            .attr("height", d => y(d[0]) - y(d[1]));
}

function drawTopCountriesBars(data) {
    d3.select("#barLegend").style("display", "block");
    barG.selectAll("*").remove();
    
    const filtered = data.filter(d => d.region === selectedRegion && d["Life Ladder Category"] === selectedCategory);
    filtered.sort((a,b) => +b["Life Ladder"] - +a["Life Ladder"]);
    const top5 = filtered.slice(0, 5);

    barG.append("text").attr("x", barWidth/2).attr("y", -20).attr("text-anchor", "middle")
        .style("font-size", "20px").style("font-weight", "bold")
        .html(`Top 5 '${selectedCategory}' in ${selectedRegion} <tspan fill="#56B4E9" style="font-weight:normal; cursor:pointer; font-size:14px">(Back)</tspan>`);

    const x = d3.scaleBand().domain(top5.map(d => d.country_geo)).range([0, barWidth]).padding(0.4);
    const y = d3.scaleLinear().domain([0, 8]).range([barHeight, 0]);

    barG.append("g").attr("transform", `translate(0,${barHeight})`).call(d3.axisBottom(x));
    barG.append("g").call(d3.axisLeft(y));

    barG.selectAll("rect").data(top5).join("rect")
        .attr("x", d => x(d.country_geo))
        .attr("width", x.bandwidth())
        .attr("y", barHeight)
        .attr("height", 0)
        .attr("fill", categoryColorScale(selectedCategory))
        .attr("cursor", "pointer")
        .on("click", (event, d) => {
            event.stopPropagation();
            handleCountrySelect(d.country_geo);
        })
        .on("mouseover", function(event, d) {
            d3.select(this).style("stroke", "#333").style("stroke-width", "2px");
            showTooltip(event, `<strong>${d.country_geo}</strong><br/>${(+d["Life Ladder"]).toFixed(2)}`);
        })
        .on("mousemove", handleMouseMove)
        .on("mouseleave", function() {
            d3.select(this).style("stroke", "none");
            hideTooltip();
        })
        .transition().duration(750).ease(d3.easeCubicOut)
        .attr("y", d => y(+d["Life Ladder"]))
        .attr("height", d => barHeight - y(+d["Life Ladder"]));
}

function drawCountryTrendChart() {
    d3.select("#barLegend").style("display", "none");
    barG.selectAll("*").remove();

    const focusCountry = selectedCountries[selectedCountries.length - 1];
    const countryInfo = fullCountryData.find(d => d.country_geo === focusCountry);
    const regionName = countryInfo ? countryInfo.region : null;

    const regionData = regionalTrendData.filter(d => d.region === regionName && +d.year <= +currentYear);
    const worldData = worldTrendData.filter(d => +d.year <= +currentYear);

    barG.append("text").attr("x", barWidth/2).attr("y", -25).attr("text-anchor", "middle")
        .style("font-size", "20px").style("font-weight", "bold")
        .text(`Comparison: ${selectedCountries.length} Selected`);

    const x = d3.scaleLinear().domain([2010, 2023]).range([0, barWidth]);
    const domainConfig = metrics[currentAttribute].domain;
    const y = d3.scaleLinear().domain([Math.min(...domainConfig), Math.max(...domainConfig)]).range([barHeight, 0]);

    barG.append("g").attr("transform", `translate(0,${barHeight})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));
    barG.append("g").call(d3.axisLeft(y));

    const lineGen = d3.line().x(d => x(+d.year)).y(d => y(+d[currentAttribute])).defined(d => !isNaN(d[currentAttribute]));

    function drawLineAndDots(data, color, dash, name, isBold) {
        if (!data || data.length === 0) return;
        
        const path = barG.append("path")
            .datum(data)
            .attr("fill", "none").attr("stroke", color)
            .attr("stroke-width", isBold ? 3 : 2)
            .attr("stroke-dasharray", dash).attr("d", lineGen);

        path.attr("opacity", 0).transition().duration(750).attr("opacity", 1);

        barG.selectAll(`.dot-${name.replace(/[^a-zA-Z0-9]/g,'')}`)
            .data(data).join("circle")
            .attr("cx", d => x(+d.year)).attr("cy", d => y(+d[currentAttribute]))
            .attr("r", 0) 
            .attr("fill", color).attr("stroke", "#fff")
            .on("mouseover", function(event, d) {
                d3.select(this).transition().attr("r", 8).attr("stroke", "#333");
                showTooltip(event, `<strong>${name}</strong>: ${(+d[currentAttribute]).toFixed(2)}`);
            })
            .on("mousemove", handleMouseMove)
            .on("mouseleave", function() {
                d3.select(this).transition().attr("r", 4).attr("stroke", "#fff");
                hideTooltip();
            })
            .transition().duration(750).ease(d3.easeBackOut)
            .attr("r", 4);
    }

    drawLineAndDots(worldData, "#999", "4,4", "World Avg", false);
    if (regionName) drawLineAndDots(regionData, "#E69F00", "8,4", regionName, false); 

    selectedCountries.forEach((country, index) => {
        const cData = fullCountryData.filter(d => d.country_geo === country && +d.year <= +currentYear);
        drawLineAndDots(cData, countryColorScale(index), "0", country, true);
    });

    // LEGEND
    const legend = barG.append("g").attr("transform", `translate(${barWidth + 15}, 0)`);
    let items = [{c: "#999", t: "World"}, {c: "#E69F00", t: regionName}];
    selectedCountries.forEach((c, i) => items.push({c: countryColorScale(i), t: c}));

    items.forEach((item, i) => {
        const row = legend.append("g").attr("transform", `translate(0, ${i*25})`);
        row.append("rect").attr("width", 12).attr("height", 12).attr("fill", item.c).attr("rx", 2);
        row.append("text").attr("x", 20).attr("y", 11).text(item.t).style("font-size", "13px");
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
        .attr("d", d => d3.line().x(d => x(+d.year)).y(d => y(+d[currentAttribute]))(d[1]))
        .attr("stroke-dasharray", function() { return this.getTotalLength() + " " + this.getTotalLength(); })
        .attr("stroke-dashoffset", function() { return this.getTotalLength(); })
        .transition().duration(1000).ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);

    lineG.selectAll(".region-dots").data(dataFiltered).join("circle")
        .attr("cx", d => x(+d.year)).attr("cy", d => y(+d[currentAttribute]))
        .attr("r", 0)
        .attr("fill", d => regionColorScale(d.region))
        .on("mouseover", function(event, d) {
             d3.select(this).transition().attr("r", 7).attr("stroke", "black");
             showTooltip(event, `<strong>${d.region}</strong><br/>${(+d[currentAttribute]).toFixed(2)}`);
        })
        .on("mousemove", handleMouseMove)
        .on("mouseleave", function() {
            d3.select(this).transition().attr("r", 3).attr("stroke", "none");
            hideTooltip();
        })
        .transition().delay((d, i) => i * 5).duration(500).attr("r", 3);
        
    const regions = Array.from(sumstat.keys()).sort();
    const legend = lineG.selectAll(".legend-item").data(regions).enter().append("g")
        .attr("transform", (d,i) => `translate(${lineWidth+10}, ${i*15})`);
    legend.append("rect").attr("width", 10).attr("height", 10).attr("fill", d => regionColorScale(d));
    legend.append("text").attr("x", 15).attr("y", 10).text(d => d).style("font-size", "10px");
}

// --- EVENTS ---
d3.select("#attributeSelect").on("change", function() { currentAttribute = this.value; updateDashboard(currentYear); });
d3.select("#yearSlider").on("input", function() { currentYear = this.value; d3.select("#yearLabel").text(currentYear); updateDashboard(currentYear); });
function showTooltip(event, html) { d3.select("#tooltip").style("opacity", 1).html(html).style("left", (event.pageX+15)+"px").style("top", (event.pageY-28)+"px"); }
function hideTooltip() { d3.select("#tooltip").style("opacity", 0); }
function handleMouseMove(event) { d3.select("#tooltip").style("left", (event.pageX+15)+"px").style("top", (event.pageY-28)+"px"); }
function handleMapMouseOver(event, d) {
    d3.select(this).raise().classed("active", true);
    const val = dataMap.get(d.properties.name);
    showTooltip(event, `<strong>${d.properties.name}</strong><br/>${val ? val.toFixed(2) : "No Data"}`);
}
function handleMapMouseLeave() { d3.select(this).classed("active", false); hideTooltip(); }