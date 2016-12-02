var graph_bgcolor = "beige";

function Graphs(graphs) {
  this.graphs = graphs;
}

Graphs.prototype.draw = function(herv_name, params) {
  var graphs = this.graphs;
  var request = new XMLHttpRequest();
  var intro_div = document.getElementById("introduction");
  intro_div.style.display = "none";
  var text_body = document.getElementById("text_body");
  text_body.style.visivility = "visible";
  text_body.style.display = "block";
  var herv_name_elements = document.getElementsByClassName("herv_name");
  for (i=0; i < herv_name_elements.length; i++) {
    herv_name_elements[i].innerHTML = herv_name;
  }
  for (var i=0; i<graphs.length; i++) {
    var div = document.getElementById(graphs[i].id);
    if (div) graphs[i].draw(herv_name, params, div);
  }
}

function get_params() {
  var res = [];
  var db_select = document.getElementById("db1");
  res["db1"] = db_select.options[db_select.selectedIndex].value;
  res["hcre1"] = document.getElementById("hcre1").checked;
  
  var z_score_mode_form = document.getElementById("z_score_mode");
  for (var i=0, length=z_score_mode_form.children.length; i<length; i++) {
    if (z_score_mode_form.children[i].checked) {
      res["z_score_mode"] = z_score_mode_form.children[i].value;
    }
  }
  
  res["z_score1"] = document.getElementById("z_score1").value;
  res["limit1"] = document.getElementById("limit1").value;
  
  var db_select = document.getElementById("db2");
  res["representative"] = document.getElementById("represent").checked;
  res["z_score2"] = document.getElementById("z_score2").value;
  res["limit2"] = document.getElementById("limit2").value;

  res["merge_cell_types"] = document.getElementById("merge_cell_types").checked;
  
  return res
}

function update_herv_list(graphs) {
  var div = document.getElementById("herv_menu");
  while (div.firstChild) {
    div.removeChild(div.firstChild);
  }
  var params = get_params();
  var args = create_args_for_tfbs(params);
  var request = new XMLHttpRequest();
  request.open("GET", "/herv_list" + args, true);
  request.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      var hervs = JSON.parse(this.responseText);
      var ul = document.createElement("ul");
      ul.setAttribute("id", "herv_list");
      function herv_list_onclick(event) {
        if (event.currentTarget.tagName == "LI") {
          var li = event.currentTarget
          for (var i=0; i<li.parentNode.children.length; i++) {
            var child = li.parentNode.children[i];
            child.style.backgroundColor = color;
          }
          li.style.backgroundColor = "cyan";
          var herv_name = li.id;
          graphs.current_herv_name = herv_name;
          graphs.draw(herv_name, params);

          set_select_options(herv_name, params);
          //TODO info function comes here
        }
      }
      for (var i=0; i < hervs.length; i++) {
        var herv_name = hervs[i]["herv_name"];
        var n = hervs[i]["n"];
        var li = document.createElement("LI");
        li.setAttribute("id", herv_name);
        li.style.display = "flex";
        li.style.flexDirection = "row";
        var herv_name_div = document.createElement("DIV");
        herv_name_div.innerHTML = herv_name;
        herv_name_div.style.width = "200px";
        var n_div = document.createElement("DIV");
        n_div.innerHTML = n;
        li.appendChild(herv_name_div);
        li.appendChild(n_div);
        if (graphs.current_herv_name == li.id) {
          li.style.backgroundColor = "cyan";
        }
        li.addEventListener("click", herv_list_onclick, false);
        ul.appendChild(li);
      }
      var color = ul.style.backgroundColor;
      div.appendChild(ul);
    }
  }
  request.send();
}

function set_params_event(graphs) {
  var param_div = document.getElementById("param_box")
  function param_change(event) {
    update_herv_list(graphs);
    var params = get_params();
    if (graphs.current_herv_name) {
      graphs.draw(graphs.current_herv_name, params);
      set_select_options(graphs.current_herv_name, params);
    }
  }
  param_div.addEventListener("change", param_change, false);
}


function create_args_for_tfbs(params) {
  var res = "?db=" + params["db1"] + ";" + 
            "hcre=" + params["hcre1"] + ";" + 
            "z_score=" + params["z_score1"] + ";" + 
            "limit=" + params["limit1"] + ";" +
            "z_score_mode=" + params["z_score_mode"] + ";";
  return res
}

function create_args_for_dhs(params) {
  var res = "?db=" + params["db2"] + ";" + 
            "representative=" + params["representative"] + ";" + 
            "z_score=" + params["z_score2"] + ";" + 
            "limit=" + params["limit2"] + ";";
  return res
}

function tfbs_depth_graph(herv_name, params, div) {
  var args = create_args_for_tfbs(params);
  var request = new XMLHttpRequest();
  request.open("GET", "graph_data/tfbs_depth/"+herv_name+args, true)
  request.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var data = JSON.parse(this.responseText);
      var layout = { title: "TFBS Depth",
                     xaxis: { title: "Position (nt)" },
                     yaxis: { title: "HERV-TFBSs (copy)" },
                     paper_bgcolor: graph_bgcolor};
      Plotly.newPlot(div, data, layout);
    }
  }
  request.send();
}

function motif_depth_graph(herv_name, params, div) {
  var args = create_args_for_tfbs(params);
  var request = new XMLHttpRequest();
  request.open("GET", "graph_data/motif_depth/"+herv_name+args, true)
  request.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var line_data = JSON.parse(this.responseText);
      var request_dot = new XMLHttpRequest();
      request_dot.open("GET", "graph_data/motif_depth_dot/"+herv_name+args, true);
      request_dot.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          var dot_data = JSON.parse(this.responseText);
          var layout = { title: "Motif Depth",
                         xaxis: { title: "Position (nt)" },
                         yaxis: { title: "TF motif in HERV-TFBSs (copy)" },
                         paper_bgcolor: graph_bgcolor};
          Plotly.newPlot(div, line_data.concat(dot_data), layout);
        }
      }
      request_dot.send();
    }
  }
  request.send();
}

function dhs_depth_graph(herv_name, params, div) {
  var args = create_args_for_dhs(params);
  var request = new XMLHttpRequest();
  request.open("GET", "graph_data/dhs_depth/"+herv_name+args, true)
  request.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var data = JSON.parse(this.responseText);
      var layout = { title: "DHS Depth",
                     xaxis: { title: "Position (nt)" },
                     yaxis: { title: "HERV-DHSs (copy)" },
                     paper_bgcolor: graph_bgcolor};
      Plotly.newPlot(div, data, layout);
    }
  }
  request.send();
}

function chromatin_state_graph(herv_name, params, div) {
  var request = new XMLHttpRequest();
  request.open("GET", "graph_data/chromatin_state/"+herv_name, true)
  request.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var data = JSON.parse(this.responseText);
      var layout = { title: "Chromatin State",
                     xaxis: { title: "" },
                     yaxis: { title: "Proportion" },
                     paper_bgcolor: graph_bgcolor};
      Plotly.newPlot(div, data, layout);
    }
  }
  request.send();
}

function heatmap_graph(herv_name, params, div) {
  var args = create_args_for_tfbs(params);
  div.style.display = "flex";
  div.style.flexDirection = "row";
  div.style.overflow = "scroll";

  while (div.firstChild) {
    div.removeChild(div.firstChild);
  }

  var tree_img = document.createElement("img");
  div.appendChild(tree_img);
  tree_img.setAttribute("src", "/image/tree/"+herv_name);

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
                              showticklabels: false },
                     paper_bgcolor: graph_bgcolor};
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
                              showticklabels: false },
                     paper_bgcolor: graph_bgcolor};
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
                              showticklabels: false },
                     paper_bgcolor: graph_bgcolor};
      Plotly.newPlot(motif_div, data, layout);
    }
  }
  motif_request.send();
}

function set_select_options(herv_name, params) {
  var tf_select_1 = document.getElementById("tf_select_1");
  var tf_select_2 = document.getElementById("tf_select_2");
  var tf_select_3 = document.getElementById("tf_select_3");
  while (tf_select_1.length > 1) {
    tf_select_1.removeChild(tf_select_1.lastChild);
  }
  while (tf_select_2.length > 1) {
    tf_select_2.removeChild(tf_select_2.lastChild);
  }
  while (tf_select_3.length > 1) {
    tf_select_3.removeChild(tf_select_3.lastChild);
  }
  var args = create_args_for_tfbs(params)
  var request = new XMLHttpRequest();
  request.open("GET", "tf_list/"+herv_name+args, true);
  request.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      var tf_list = JSON.parse(this.responseText);
      for (var i=0; i<tf_list.length; i++) {
        var option_1 = document.createElement("option");
        var option_2 = document.createElement("option");
        var option_3 = document.createElement("option");
        option_1.value = tf_list[i];
        option_2.value = tf_list[i];
        option_3.value = tf_list[i];
        option_1.innerHTML = tf_list[i];
        option_2.innerHTML = tf_list[i];
        option_3.innerHTML = tf_list[i];
        tf_select_1.append(option_1);
        tf_select_2.append(option_2);
        tf_select_3.append(option_3);
      }
      if (params["merge_cell_types"]) {
         var merge = "true";
         var merged = "_merged";
      } else {
         var merge = "false";
         var merged = "";
      }
      var a1 = document.getElementById(tf_select_1.getAttribute("anchor_id"));
      a1.setAttribute("href", "/download/herv_tfbs_position/"+herv_name+"?tf=all;merge_cell_types="+merge+";");
      a1.setAttribute("download", herv_name + "_all_tfbs" + merged + ".tsv");
      var a2 = document.getElementById(tf_select_2.getAttribute("anchor_id"));
      a2.setAttribute("href", "/download/hcre_position/"+herv_name+"?tf=all;merge_cell_types="+merge+";");
      a2.setAttribute("download", herv_name + "_all_hcre" + merged + ".tsv");
      var a3 = document.getElementById(tf_select_3.getAttribute("anchor_id"));
      a3.setAttribute("href", "/download/ontology/"+herv_name+"?tf=all;merge_cell_types="+merge+";");
      a3.setAttribute("download", herv_name + "all_ontology" + merged + ".tsv");

      function tf_select_1_change(event) {
        var tf = event.target.value;
        var anchor = document.getElementById(event.target.getAttribute("anchor_id"));
        anchor.setAttribute("href",
                            "/download/herv_tfbs_position/"+herv_name+"?tf="+tf+";merge_cell_types="+merge+";");
        anchor.setAttribute("download",
                            herv_name + "_" + tf + "_tfbs" + merged + ".tsv");
      }
      tf_select_1.addEventListener("change", tf_select_1_change, false);
      function tf_select_2_change(event) {
        var tf = event.target.value;
        var anchor = document.getElementById(event.target.getAttribute("anchor_id"));
        anchor.setAttribute("href",
                            "/download/hcre_position/"+herv_name+"?tf="+tf+";merge_cell_types="+merge+";");
        anchor.setAttribute("download",
                            herv_name + "_" + tf + "_hcre" + merged + ".tsv");
      }
      tf_select_2.addEventListener("change", tf_select_2_change, false);
      function tf_select_3_change(event) {
        var tf = event.target.value;
        var anchor = document.getElementById(event.target.getAttribute("anchor_id"));
        anchor.setAttribute("href",
                            "/download/ontology/"+herv_name+"?tf="+tf+";merge_cell_types="+merge+";");
        anchor.setAttribute("download",
                            herv_name + "_" + tf + "_ontology" + merged + ".tsv");
      }
      tf_select_3.addEventListener("change", tf_select_3_change, false);
    }
  }
  request.send();

  var hcre_anchor = document.getElementById("dl_hcre");
  hcre_anchor.setAttribute("href", "/download/hcre/"+herv_name);
  hcre_anchor.setAttribute("download", herv_name+".tsv");
  
  var dhs_anchor = document.getElementById("dl_dhs_position");
  dhs_anchor.setAttribute("href", "/download/dhs_position/"+herv_name);
  dhs_anchor.setAttribute("download", herv_name+"_dhs"+".tsv");
}

var graphs = new Graphs([{id: "tfbs_depth_graph", draw: tfbs_depth_graph},
                         {id: "motif_depth_graph", draw: motif_depth_graph},
                         {id: "dhs_depth_graph", draw: dhs_depth_graph},
                         {id: "chromatin_state_graph",
                          draw: chromatin_state_graph},
                         {id: "heat_maps", draw: heatmap_graph}]);
update_herv_list(graphs);
set_params_event(graphs);
