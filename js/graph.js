console.log("Loaded graph.js script")

var svg = d3.select('svg');
var width = +svg.attr('width');
var height = +svg.attr('height');

var colorScale = d3.scaleOrdinal(d3.schemeTableau10);
var linkScale = d3.scaleLinear().range([2,6]);
var selectedNode;

var linkG = svg.append('g')
    .attr('class', 'links-group');

var nodeG = svg.append('g')
    .attr('class', 'nodes-group');

var markers = svg.append('defs').append('marker')
        markers.attrs({'id':'arrowhead',
            'viewBox':'-0 -5 10 10',
            'refX':13,
            'refY':0,
            'orient':'auto',
            'markerWidth':30,
            'markerHeight':30,
            'markerUnits':"userSpaceOnUse",
            'xoverflow':'visible'})
        .append('svg:path')
        .attr('d', 'M 0,-5 L 8 ,0 L 0,5')
        .attr('fill', '#999')
        .attr('stroke-width', 5)
        .style('stroke','none');

function includedNodes(nodes, links) {
  var relevantNodes = extractNodes(includedLinks(links));
  relevantNodes.sort(function(x,y){ return x == selectedNode ? -1 : y == selectedNode ? 1 : 0; });
  //console.log("R");
  console.log(relevantNodes);
  return relevantNodes;
}

function includedLinks(links) {
  //console.log(selectedNode)
  var newLinks = []
  links.forEach(link => {
    link.source.type = link.source.type!= undefined && link.source.type === "close" ? "close" : "far"
    link.target.type =  link.target.type!= undefined && link.target.type === "close" ? "close" : "far"
    if (link.source === selectedNode || link.target === selectedNode) {
      link.type = "close"
      link.source.type = "close"
      link.target.type = "close"
      newLinks.push(link)
    }
  })
  var newerLinks = [...newLinks];
  links.forEach(link => {
    // Ignore included links
    if (link.source === selectedNode || link.target === selectedNode) {
      return;
    }
    var containsSource = newLinks.some(otherLink => otherLink.source === link.source ||
                                                    otherLink.target === link.source)
    var containsTarget = newLinks.some(otherLink => otherLink.source === link.target ||
                                                    otherLink.target === link.target)
    if (containsSource || containsTarget) {
      link.type = "far"
      newerLinks.push(link)
    }
  })
  return newerLinks;
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
      .html(function(d) {
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

    // For Testing
    selectedNode = network.nodes[0];
    selectedNode.fx = width / 2;
    selectedNode.fy = height / 2
    selectedNode.group = 2


    updateVisualization()
})

function updateVisualization() {
    linkScale.domain(d3.extent(includedLinks(network.links), function(d){ return d.value;}));

    var links = linkG.selectAll('.link')
      .data(includedLinks(network.links))

    var nodes = nodeG.selectAll('.node')
        .data(includedNodes(network.nodes, network.links))

    console.log(nodes.filter(function (d, i) { return i === 1;}))
    //links.filter(function (d, i) { return i === 0;}).remove()

    var nodeEnter = nodes.enter()
    .append('circle')
    .attr('class', 'node')

    var linkEnter = links.enter()
      .append('line')
      .attr('class', 'link')

    links.merge(linkEnter)
    .attr('stroke-width', function(d) {
        return linkScale(d.value);
    })
    .attr('opacity', function(link) {
      return link.type === "close" ? 1 : 0.1
    });

    linkEnter.attr('marker-end','url(#arrowhead)')


    nodes.merge(nodeEnter)
    .attr('r', 20)
    .style('fill', function(d) {
        return colorScale(d.group);
    })
    .attr('opacity', function(node) {
      return node.type === "close" ? 1 : 0.1
    });




    function tickSimulation() {
      linkEnter
      .attr('x1', function(d) {return d.source.x;})
      .attr('y1', function(d) {return d.source.y;})
      .attr('x2', function(d) { return d.target.x;})
      .attr('y2', function(d) { return d.target.y;});



      nodeEnter
      .attr('cx', function(d) { return d.x;})
      .attr('cy', function(d) { return d.y;});
        //console.log(selectedNode.x, selectedNode.y)
    }

    nodes.exit().remove();
    links.exit().remove();


    simulation
        .nodes(includedNodes(network.nodes, network.links))
        .on('tick', tickSimulation);

    simulation
        .force('link')
        .links(includedLinks(network.links));

    nodeEnter.on('mouseover', node_tip.show)
      .on('mouseout', node_tip.hide);
    linkEnter.on('mouseover', link_tip.show)
      .on('mouseout', link_tip.hide);

    nodeEnter.on('click', function(d) {
      simulation.stop()
      console.log(simulation.nodes());
      delete selectedNode.fx
      delete selectedNode.fy
      selectedNode.vx = 1
      selectedNode.vy = 1
      selectedNode.index = d.index
      selectedNode.group = 1
      selectedNode = d;
      selectedNode.group = 2
      selectedNode.fx = width / 2
      selectedNode.fy = height / 2
      selectedNode.index = 0;
      updateVisualization()
      simulation.alpha(1).restart();
      node_tip.hide()
      link_tip.hide()
      console.log(simulation.nodes());
    })


    //console.log(network)
}
