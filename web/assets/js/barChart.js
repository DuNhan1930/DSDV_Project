function renderBarChart(data, tooltip) {
  const container = d3.select("#bar-chart");

  function draw() {
    container.selectAll("*").remove();

    const margin = { top: 24, right: 24, bottom: 40, left: 56 };
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", width).attr("height", height);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const avgByYear = d3.rollups(
      data,
      v => d3.mean(v, d => d.Price_USD),
      d => d.Year
    ).map(([Year, AvgPrice]) => ({ Year, AvgPrice }));

    avgByYear.sort((a, b) => d3.ascending(a.Year, b.Year));

    const x = d3.scaleBand()
      .domain(avgByYear.map(d => d.Year))
      .range([0, innerW])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(avgByYear, d => d.AvgPrice) || 0])
      .nice()
      .range([innerH, 0]);

    g.append("g").attr("class", "axis")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    g.append("g").attr("class", "axis").call(d3.axisLeft(y));

    g.selectAll(".bar")
      .data(avgByYear)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.Year))
      .attr("y", d => y(d.AvgPrice))
      .attr("width", x.bandwidth())
      .attr("height", d => innerH - y(d.AvgPrice))
      .on("mousemove", (event, d) => {
        tooltip.style("opacity", 0.95)
          .html(`Year: ${d.Year}<br/>Avg Price: ${d3.format(",.0f")(d.AvgPrice)}`)
          .style("left", (event.pageX + 12) + "px")
          .style("top", (event.pageY - 24) + "px");
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));
  }

  draw();
  window.addEventListener("resize", draw);
}
