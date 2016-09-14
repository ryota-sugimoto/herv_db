function Graphs(graphs) {
  this.div = document.createElement("div");
  this._graphs = [];
  for (var i=0; i<graphs.length; i++) {
    var div = document.createElement("div");
    div.setAttribute("id", graphs[i].title);
    var o = {"div": div,
             "title": graphs[i].title,
             "draw": graphs[i].draw}
    this._graphs.push(o);
    this.div.appendChild(div);
  }
}

Graphs.prototype.draw = function(herv_name) {
  for (var i=0; i<this._graphs.length; i++) {
    this._graphs[i].draw(herv_name, this._graphs[i].div);
  }
}

function herv_list(div, graphs) {
  var request = new XMLHttpRequest();
  request.open("GET", "herv_list", true);
  request.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      var hervs = JSON.parse(this.responseText);
      var i;
      var out = "";
      for (i = 0; i < hervs.length; i++) {
        out += '<li id="' + hervs[i].id + '">' +
               hervs[i].name + '</li>';
      }
      var ul = document.createElement("ul");
      ul.setAttribute("id", "herv_list");
      ul.innerHTML = out;
      function herv_list_onclick(event) {
        if (event.target.tagName == "LI") {
          graphs.draw(event.target.id);
        }
      }
      ul.addEventListener("click", herv_list_onclick, false);
      div.appendChild(ul);
    }
  }
  request.send();
}

function tfbs_depth_graph(herv_name, div) {
  var request = new XMLHttpRequest()
  request.open("GET", "graph_data/tfbs_depth/"+herv_name, true)
  div.setAttribute("id", "tfbs_depth_graph:"+herv_name);
  request.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var data = JSON.parse(this.responseText);
      var layout = { title: "TFBS Depth",
                     xaxis: { title: "Position (nt)" },
                     yaxis: { title: "HERV-TFBSs (copy)" }};
      Plotly.newPlot(div, data, layout);
    }
  }
  request.send();
}

function motif_depth_graph(herv_name, div) {
  var request = new XMLHttpRequest()
  request.open("GET", "graph_data/motif_depth/"+herv_name, true)
  div.setAttribute("id", "motif_depth_graph:"+herv_name);
  request.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var data = JSON.parse(this.responseText);
      var layout = { title: "Motif Depth",
                     xaxis: { title: "Position (nt)" },
                     yaxis: { title: "TF motif in HERV-TFBSs (copy)" }};
      Plotly.newPlot(div, data, layout);
    }
  }
  request.send();
}
var graphs = new Graphs([{title: "TFBS depth", draw: tfbs_depth_graph},
                         {title: "Motif depth", draw: motif_depth_graph}]);
var herv_menu_div = document.getElementById("herv_menu");
var right_div = document.getElementById("right");
var herv_list_div = document.createElement("div");
herv_menu_div.appendChild(herv_list_div);
right_div.appendChild(graphs.div);
herv_list(herv_list_div, graphs);
