function renderModelChart(data, tooltip) {
  const container = d3.select("#model-chart");
  const select = document.getElementById("model-select");

  const models = Array.from(new Set(data.map(d => d.Model.trim()))).sort();
  select.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join("");

  function draw(model) {
    container.selectAll("*").remove();

    const margin = { top: 24, right: 24, bottom: 40, left: 56 };
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", width).attr("height", height);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const filtered = data.filter(d => d.Model.trim() === model && !Number.isNaN(d.Sales_Volume));

    const byYear = d3.rollups(
      filtered,
      v => d3.mean(v, d => d.Sales_Volume),
      d => d.Year
    ).map(([Year, Sales]) => ({ Year, Sales }));

    byYear.sort((a, b) => d3.ascending(a.Year, b.Year));

    const x = d3.scaleLinear()
      .domain(d3.extent(byYear, d => d.Year))
      .range([0, innerW]);

    const yMin = d3.min(byYear, d => d.Sales);
    const yMax = d3.max(byYear, d => d.Sales);
    const y = d3.scaleLinear()
      .domain([yMin != null ? Math.floor(yMin) : 0, yMax != null ? Math.ceil(yMax) : 1])
      .nice()
      .range([innerH, 0]);

    g.append("g").attr("class", "axis")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    g.append("g").attr("class", "axis").call(d3.axisLeft(y));

    const line = d3.line()
      .x(d => x(d.Year))
      .y(d => y(d.Sales));

    g.append("path")
      .datum(byYear)
      .attr("class", "line")
      .attr("d", line)
      .attr("stroke", "#262626")
      .attr("fill", "none")
      .attr("stroke-width", 2);

    g.selectAll("circle")
      .data(byYear)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.Year))
      .attr("cy", d => y(d.Sales))
      .attr("r", 3.5)
      .attr("fill", "#262626")
      .on("mousemove", (event, d) => {
        tooltip.style("opacity", 0.95)
          .html(`Model: ${model}<br/>Year: ${d.Year}<br/>Sales: ${d3.format(",.0f")(d.Sales)}`)
          .style("left", (event.pageX + 12) + "px")
          .style("top", (event.pageY - 24) + "px");
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));
  }

  if (models.length > 0) draw(models[0]);

  select.addEventListener("change", e => draw(e.target.value));
  window.addEventListener("resize", () => draw(select.value));
}
