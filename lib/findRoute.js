var net = require("./RoutePlanNet.json")[0];

//var startNode = "582166_6506292";
var startNode = "578886_6503954";
//var endNode = "583068_6505349";
var endNode = "585239_6504501";

var maxDist = 9999;
var activeBranches = 0;

var getAbsDist = (node1,node2)=>{
    var xs = parseInt(node1.substring(0,node1.indexOf("_")));
    var ys = parseInt(node1.substring(node1.indexOf("_")+1));
    var xe = parseInt(node2.substring(0,node2.indexOf("_")));
    var ye = parseInt(node2.substring(node2.indexOf("_")+1));

    return Math.sqrt(Math.pow((xe-xs),2)+Math.pow((ye-ys),2));
}

function node(name) {
  if (node.all[name]) { return node.all[name]; }
  if (!(this instanceof node)) { return new node(name); }
  node.all[name] = this;
  this.name = name;
  this.links = [];
  this.toString = function() { return name; }
}
node.all = {};

function link(n1, n2, cost) {
  if( !(n1 instanceof node)) { n1 = node(n1); }
  if( !(n2 instanceof node)) { n2 = node(n2); }
  if(!(this instanceof link)) { return new link(n1,n2,cost); }
  for(var i=0; i<n1.links.length; ++i) {
    var l = n1.links[i];
    if (l.n1 === n2 || l.n2 === n2) { l.cost = cost; return l; }
  }
  n1.links.push(this);
  n2.links.push(this);

  this.n1 = n1;
  this.n2 = n2;
  this.cost = cost;
  this.toString = function() { return n1 + ">" + n2 + " (" + cost + ")"; }
  this.far = function(near) { return (near==n2)?n1:n2; }
}

function path(prev, node, cost) {
  if(!(this instanceof path)) { return new path(prev,node,cost); }
  this.node = node;
  this.cost = cost;
  this.elements = function() {
    var a = prev? prev.elements() : [];
    a.push(this.node);
    return a;
  }
  this.toString = function() {
    return (prev?prev + ' > ':"") + node + " (" + cost + ")";
  }
}

function insert_sorted(list, key, item) {
  for(var i=0; i<list.length; ++i) {
    if (list[i][key] > item[key]) { list.splice(i, 0, item); return list; }
  }
  list.push(item);
  return list;
}


function findPath(from, to) {
  if( !(from instanceof node)) { from = node(from); }
  if( !(to instanceof node)) { to = node(to); }

  var visited = { },
    stack = [ path(null, from, 0) ],
    cur;

  while (cur = stack.shift()) {
    //console.log(cur.toString());
    if( cur.node === to ) { return cur; }
    for(var i=0; i<cur.node.links.length; ++i) {
      var link = cur.node.links[i],
        other = link.far(cur.node);
      if (visited[other]) { continue; }
      insert_sorted(stack, 'cost', path(cur, other, link.cost+cur.cost));
    }
    visited[cur.node] = true;
  }
}

var finnishBranch = (cost,route)=>{
    var features = [];
    var output =    {
                        "type": "FeatureCollection",
                        "crs": {
                        "type": "EPSG",
                        "properties": {"code": 3006}
                    }};
    console.log("finnishBranch", activeBranches);
    console.log("Cost:", cost, " Route:", route);

    var coords = route.map(item => {
        return [parseInt(item.substring(0,item.indexOf("_"))),parseInt(item.substring(item.indexOf("_")+1))];
    });
    var geom = {};
    geom.type = "LineString";
    geom.coordinates = coords;

    var feat = {};
    feat.type = "feature";
    feat.geometry = geom;
    feat.properties = {"cost":cost};
    features.push(feat);
    output.features = features;

    console.log(JSON.stringify(output));
}

var buildTree = (cb)=>{
    for (nodeKey in net) {
        if (net.hasOwnProperty(nodeKey)){
                for(endKey in net[nodeKey]) {
                    link(nodeKey, net[nodeKey][endKey].End, parseInt(net[nodeKey][endKey].Cost));
                }
        }
    }
    cb();
}

console.log("----------STARTING----------");
console.log("Finding route from", startNode, "to", endNode, "with dist", getAbsDist(startNode,endNode));

buildTree(()=>{
    console.log("Tree builded");
    var result = findPath(startNode, endNode).elements();
    var coord_result = [];
    for (element in result){
        var nodename = result[element].name;
        var xs = parseInt(nodename.substring(0,nodename.indexOf("_")));
        var ys = parseInt(nodename.substring(nodename.indexOf("_")+1));
        coord_result.push(nodename);
    }
    console.log(coord_result);
    finnishBranch(999,coord_result);

});
