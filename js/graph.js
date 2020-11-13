console.log("Loaded graph.js script")

var svg = d3.select('svg');
var width = +svg.attr('width');
var height = +svg.attr('height');

var colorScale = d3.scaleOrdinal(d3.schemeTableau10);
var linkScale = d3.scaleSqrt().range([1,10]);
var selectedNode;

function includedNodes(nodes, links) {
  var relevantNodes = extractNodes(includedLinks(links));
  relevantNodes.sort(function(x,y){ return x == selectedNode ? -1 : y == selectedNode ? 1 : 0; });
  return relevantNodes;
}

function includedLinks(links) {
  var newLinks = []
  links.forEach(link => {
    if (link.source === selectedNode || link.target === selectedNode) {
      newLinks.push(link)
    }
  })
  return newLinks;
}

function extractNodes(links) {
  var nodes = new Set();
  links.forEach(link => {
    nodes.add(link.source)
    nodes.add(link.target)
  })
  return Array.from(nodes);
}
console.log(width)
console.log(height)
var simulation = d3.forceSimulation()
    .force('link', d3.forceLink().id(function(d) { return d.id; }))
    .force('charge', d3.forceManyBody().strength(function(d, i) { return d === selectedNode ? -10000 : -30; }))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collide', d3.forceCollide(50))
    .force('radial', d3.forceRadial(60).strength(function(d) {
        return 0.1;
    }))

// Define the div for the tooltip
var node_tip = d3.tip()
      .attr("class", "d3-tip")
      .offset([-8, 0])
      .html(function(d) { return "Name: " + d.id});
svg.call(node_tip);

// Define the div for the tooltip
var link_tip = d3.tip()
      .attr("class", "d3-tip")
      .offset([-8, 0])
      .html(function(d) { console.log(d);
        const formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2
        })
        return formatter.format(d.value)});
svg.call(link_tip);

//TODO fix selected node at center
d3.dsv("|", '/data/mini_dataset/transactions/cm_trans/cm_trans20.txt').then(function(dataset) {
    //console.log(dataset)
    network = {"links": [], "nodes": []}
    for (i in dataset) {
      d = dataset[i]
      if(i === "columns") {
        break;
      }
      node1 = network.nodes.find(node => node.id === d.SOURCE_ID)
      if (node1 === undefined) {
        node1 = {
          "id": d.SOURCE_ID,
          "group": 1,
        }
      }
      node2 = network.nodes.find(node => node.id === d.TARGET_ID)
      if (node2 === undefined) {
        node2 = {
          "id": d.TARGET_ID,
          "group": 1,
        }
      }

      link = {
        "source": node1,
        "target": node2,
        "value": d.AMOUNT,
      }
      network["links"].push(link)
      if (!network.nodes.some(node => node.id === d.SOURCE_ID)) {
        network["nodes"].push(node1)
      }
      if (!network.nodes.some(node => node.id === d.TARGET_ID)) {
        network["nodes"].push(node2)
      }
    }
    //console.log(network)
    dataset = network
    linkScale.domain(d3.extent(network.links, function(d){ return d.value;}));

    // For Testing
    selectedNode = network.nodes[0];
    selectedNode.fx = width / 2;
    selectedNode.fy = height / 2
    var linkG = svg.append('g')
        .attr('class', 'links-group');

    var nodeG = svg.append('g')
        .attr('class', 'nodes-group');

    var linkEnter = linkG.selectAll('.link')
    .data(includedLinks(network.links))
    .enter()
    .append('line')
    .attr('class', 'link')
    .attr('stroke-width', function(d) {
        return linkScale(d.value);
    });

    var nodeEnter = nodeG.selectAll('.node')
        .data(includedNodes(network.nodes, network.links))
        .enter()
        .append('circle')
        .attr('class', 'node')
        .attr('r', 20)
        .style('fill', function(d) {
            return colorScale(d.group);
        });

    simulation
        .nodes(dataset.nodes)
        .on('tick', tickSimulation);

    simulation
        .force('link')
        .links(dataset.links);

    function tickSimulation() {
        linkEnter
            .attr('x1', function(d) {return d.source.x;})
            .attr('y1', function(d) {return d.source.y;})
            .attr('x2', function(d) { return d.target.x;})
            .attr('y2', function(d) { return d.target.y;});

        nodeEnter
            .attr('cx', function(d) { return d.x;})
            .attr('cy', function(d) { return d.y;});
        console.log(selectedNode.x, selectedNode.y)
    }

    nodeEnter.on('mouseover', node_tip.show)
      .on('mouseout', node_tip.hide);
    linkEnter.on('mouseover', link_tip.show)
      .on('mouseout', link_tip.hide);
})
