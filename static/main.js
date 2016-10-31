function Graphs(div, graphs) {
  this.div = div;
  this.graphs = graphs;
}

Graphs.prototype.draw = function(herv_name, params) {
  var content_div = this.div;
  var graphs = this.graphs;
  var request = new XMLHttpRequest();
  request.open("GET", "static/content.html", true);
  request.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      content_div.innerHTML = this.responseText;
      for (var i=0; i<graphs.length; i++) {
        var div = document.getElementById(graphs[i].id);
        if (div) graphs[i].draw(herv_name, params, div);
      }
    }  
  }
  request.send()
}

function get_params() {
  var res = [];
  var db_select = document.getElementById("db");
  res["db"] = db_select.options[db_select.selectedIndex].value;

  res["hcre"] = document.getElementById("hcre").checked;
  res["z_score"] = document.getElementById("z_score").value;
  res["limit"] = document.getElementById("limit").value;
  return res
}

function herv_list(div, graphs) {
  var request = new XMLHttpRequest();
  request.open("GET", "static/herv_list.json", true);
  request.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      var hervs = JSON.parse(this.responseText);
      var out = "";
      for (var i=0; i < hervs.length; i++) {
        out += '<li id="' + hervs[i].id + '">' +
               hervs[i].name + '</li>';
      }
      var ul = document.createElement("ul");
      ul.setAttribute("id", "herv_list");
      ul.innerHTML = out;
      function herv_list_onclick(event) {
        if (event.target.tagName == "LI") {
          var params = get_params();
          for (var i=0; i<event.target.parentNode.children.length; i++) { 
            event.target.parentNode.children[i].style.backgroundColor = "white";
          }
          event.target.style.backgroundColor = "cyan";
          graphs.current_herv_name = event.target.id;
          graphs.draw(event.target.id, params);
        }
      }
      ul.addEventListener("click", herv_list_onclick, false);
      div.appendChild(ul);
     
      var param_div = document.getElementById("param_box")
      function param_change(event) {
        var params = get_params();
        if (graphs.current_herv_name) {
          graphs.draw(graphs.current_herv_name, params);
        }
      }
      param_div.addEventListener("change", param_change, false);
    }
  }
  request.send();
}


function create_args(params) {
  var res = "?db=" + params["db"] + ";" + 
            "hcre=" + params["hcre"] + ";" + 
            "z_score=" + params["z_score"] + ";" + 
            "limit=" + params["limit"] + ";";
  return res
}


function tfbs_depth_graph(herv_name, params, div) {
  var args = create_args(params);
  var request = new XMLHttpRequest();
  request.open("GET", "graph_data/tfbs_depth/"+herv_name+args, true)
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

function motif_depth_graph(herv_name, params, div) {
  var args = create_args(params);
  var request = new XMLHttpRequest();
  request.open("GET", "graph_data/motif_depth/"+herv_name+args, true)
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

function dhs_depth_graph(herv_name, params, div) {
  var args = create_args(params);
  var request = new XMLHttpRequest();
  request.open("GET", "graph_data/dhs_depth/"+herv_name+args, true)
  request.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var data = JSON.parse(this.responseText);
      var layout = { title: "DHS Depth",
                     xaxis: { title: "Position (nt)" },
                     yaxis: { title: "HERV-DHSs (copy)" }};
      Plotly.newPlot(div, data, layout);
    }
  }
  request.send();
}

function chromatin_state_graph(herv_name, params, div) {
  var args = create_args(params);
  var request = new XMLHttpRequest();
  request.open("GET", "graph_data/chromatin_state/"+herv_name+args, true)
  request.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var data = JSON.parse(this.responseText);
      var layout = { title: "Chromatin State",
                     xaxis: { title: "" },
                     yaxis: { title: "Proportion" }};
      Plotly.newPlot(div, data, layout);
    }
  }
  request.send();
}

function heatmap_graph(herv_name, params, div) {
  var args = create_args(params);
  div.style.display = "flex";
  div.style.flexDirection = "row";
  div.style.overflow = "scroll";

  var ortholog_div = document.createElement("div");
  div.appendChild(ortholog_div);
  var ortholog_request = new XMLHttpRequest();
  ortholog_request.open("GET", "graph_data/ortholog/"+herv_name+args, true)
  ortholog_request.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var data = JSON.parse(this.responseText);
      var layout = { title: "Ortholog",
                     xaxis: { title: "" },
                     yaxis: { title: "Locus",
                              ticks: "",
                              showticklabels: false }};
      Plotly.newPlot(ortholog_div, data, layout);
    }
  }
  ortholog_request.send();

  var TFBS_div = document.createElement("div");
  div.appendChild(TFBS_div);
  var TFBS_request = new XMLHttpRequest();
  TFBS_request.open("GET", "graph_data/TFBS_phylogeny/"+herv_name+args, true)
  TFBS_request.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var data = JSON.parse(this.responseText);
      var layout = { title: "TFBS phylogeny",
                     xaxis: { title: "" },
                     yaxis: { title: "Locus",
                              ticks: "",
                              showticklabels: false }};
      Plotly.newPlot(TFBS_div, data, layout);
    }
  }
  TFBS_request.send();

  var motif_div = document.createElement("div");
  div.appendChild(motif_div);
  var motif_request = new XMLHttpRequest();
  motif_request.open("GET", "graph_data/motif_phylogeny/"+herv_name+args, true);
  motif_request.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var data = JSON.parse(this.responseText);
      var layout = { title: "motif phylogeny",
                     xaxis: { title: "" },
                     yaxis: { title: "Locus",
                              ticks: "",
                              showticklabels: false }};
      Plotly.newPlot(motif_div, data, layout);
    }
  }
  motif_request.send();
}

function get_top_html(div) {
  var request = new XMLHttpRequest();
  request.open("GET", "static/top.html", true);
  request.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      div.innerHTML = this.responseText;
    }
  }
  request.send();
}
  

var right_div = document.getElementById("right");
var graphs = new Graphs(right_div,
                        [{id: "tfbs_depth_graph", draw: tfbs_depth_graph},
                         {id: "motif_depth_graph", draw: motif_depth_graph},
                         {id: "dhs_depth_graph", draw: dhs_depth_graph},
                         {id: "chromatin_state_graph",
                          draw: chromatin_state_graph},
                         {id: "heat_maps", draw: heatmap_graph}]);
var herv_menu_div = document.getElementById("herv_menu");
var herv_list_div = document.createElement("div");
herv_menu_div.appendChild(herv_list_div);
get_top_html(right_div);
herv_list(herv_list_div, graphs);
