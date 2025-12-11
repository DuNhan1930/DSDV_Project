function renderLineChart(data, tooltip) {
  const container = d3.select("#line-chart");

  function draw() {
    container.selectAll("*").remove();

    const margin = { top: 24, right: 24, bottom: 40, left: 56 };
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", width).attr("height", height);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const countByYear = d3.rollups(
      data, v => v.length, d => d.Year
    ).map(([Year, Count]) => ({ Year, Count }));

    countByYear.sort((a, b) => d3.ascending(a.Year, b.Year));

    const x = d3.scaleLinear()
      .domain(d3.extent(countByYear, d => d.Year))
      .range([0, innerW]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(countByYear, d => d.Count) || 0])
      .nice()
      .range([innerH, 0]);

    g.append("g").attr("class", "axis")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format("d")));

    g.append("g").attr("class", "axis").call(d3.axisLeft(y));

    const line = d3.line()
      .x(d => x(d.Year))
      .y(d => y(d.Count));

    g.append("path")
      .datum(countByYear)
      .attr("class", "line")
      .attr("d", line);

    g.selectAll("circle")
      .data(countByYear)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.Year))
      .attr("cy", d => y(d.Count))
      .attr("r", 3.5)
      .attr("fill", "#262626")
      .on("mousemove", (event, d) => {
        tooltip.style("opacity", 0.95)
          .html(`Year: ${d.Year}<br/>Count: ${d.Count}`)
          .style("left", (event.pageX + 12) + "px")
          .style("top", (event.pageY - 24) + "px");
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));
  }

  draw();
  window.addEventListener("resize", draw);
}
