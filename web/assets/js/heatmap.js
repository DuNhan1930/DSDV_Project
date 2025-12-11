function renderHeatmap(data) {
  const container = d3.select("#heatmap");
  container.selectAll("*").remove();

  const margin = { top: 40, right: 20, bottom: 40, left: 80 };
  const width = container.node().clientWidth;
  const height = container.node().clientHeight;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const years = Array.from(new Set(data.map(d => d.Year))).sort(d3.ascending);
  const models = Array.from(new Set(data.map(d => d.Model))).sort();

  const matrix = years.map(year => {
    const row = { Year: year };
    models.forEach(m => {
      const entry = data.find(d => d.Year === year && d.Model === m);
      row[m] = entry ? entry.Sales_Volume : null;
    });
    return row;
  });

  // Normalize ranks per year
  const normalized = matrix.map(row => {
    const values = models.map(m => row[m]).filter(v => v != null);
    const max = d3.max(values);
    const min = d3.min(values);
    const normRow = {};
    models.forEach(m => {
      const v = row[m];
      if (v != null) {
        normRow[m] = (max - v) / (max - min); // best seller = 0, worst = 1
      } else {
        normRow[m] = null;
      }
    });
    return { Year: row.Year, values: normRow, raw: row };
  });

  const x = d3.scaleBand().domain(models).range([0, innerW]).padding(0.05);
  const y = d3.scaleBand().domain(years).range([0, innerH]).padding(0.05);

  const color = d3.scaleLinear().domain([1, 0]).range(["#deebf7", "#08306b"]);

  const cellData = normalized.flatMap(row => models.map(m => ({
    Year: row.Year,
    Model: m,
    value: row.values[m],
    raw: row.raw[m]
  })));

  // Draw cells
  g.selectAll("rect")
    .data(cellData)
    .enter()
    .append("rect")
    .attr("x", d => x(d.Model))
    .attr("y", d => y(d.Year))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", d => d.value != null ? color(d.value) : "#ccc")
    .attr("stroke", "#999");

  // Annotate with raw sales and dynamic text color
  g.selectAll("text")
    .data(cellData)
    .enter()
    .append("text")
    .attr("x", d => x(d.Model) + x.bandwidth() / 2)
    .attr("y", d => y(d.Year) + y.bandwidth() / 2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .attr("font-size", "10px")
    .attr("fill", d => {
      if (d.value == null) return "#000";
      const rgb = d3.rgb(color(d.value));
      const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
      return brightness < 125 ? "#fff" : "#000";
    })
    .text(d => d.raw != null ? d.raw : "");

  // Axes
  g.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x));

  g.append("g").attr("class", "axis").call(d3.axisLeft(y));
}
