function Graphs(graphs) {
  this.graphs = graphs;
  var that = this;
  $(window).on("hashchange", function() {
    var herv_name = location.hash.match(/^#!basic-info\/(.*)/m)[1];
    if (herv_name) {
      that.herv_name = herv_name;
      that.draw(); 
    }
  });
  function param_change() {
    if (that.herv_name) {
      that.draw();
    }
  }
  $("#tfbs_hcre_param").on("change", param_change);
  $("#dhs_param").on("change", param_change);
}

Graphs.prototype.draw = function(herv_name) {
  if (!herv_name) { herv_name = this.herv_name }
  var params = get_params();
  $("#introduction").css("display", "none");
  $("#text_body").css("visivility", "visible");
  $("#text_body").css("display", "block");
  $(".herv_name").html(herv_name);
  for (var i=0; i<this.graphs.length; i++) {
    var div = document.getElementById(this.graphs[i].id);
    if (div) this.graphs[i].draw(herv_name, params, div);
  }
};

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

function Herv_list(data, div) {
  this.data = data;
  var that = this;
  while (div.firstChild) {
    div.removeChild(div.firstChild);
  }
  var table_element = document.createElement("TABLE");
  this.table_element = table_element;
  table_element.setAttribute("id", "herv_table");
  table_element.setAttribute("class", "display compact");
  div.append(table_element);
  this.dataTable = $("#herv_table").DataTable({
    scroller: true,
    scrollY: "25vh",
    scrollCollapse: true,
    order: [[1, "asc"]],
    paging: false,
    prosessing: true,
    columns: [{ className: "details-control",
                orderable: false,
                data: null,
                defaultContent: ""},
              { title: "HERV",
                data: "herv_anchor"},
              { title: "# TFBS",
                data: "n_tfs"}]
  });
  this.update_table();
  $("#tfbs_hcre_param").on("change", function(e) {that.update_table();});
  
  function child_table(tfs) {
    var table = document.createElement("TABLE");
    $(table).css("margin", "auto");
    var thead = document.createElement("THEAD");
    var header_row = document.createElement("TR");
    $(header_row)
      .html("<td>TF</td><td>Count based z</td><td>Depth based z</td>");
    $(table).append($(thead).append(header_row));
    var mode = $("#z_score_mode")
               .children("input[name=z_score_mode]:checked").val();
    tfs.sort(function (tf1,tf2) {
      return(tf2[mode] - tf1[mode]);
    });
    for (var i=0; i<tfs.length; i++) {
      var tf = tfs[i];
      if (tf.pass) {
        var tr = document.createElement("TR");
        $(tr).html("<td>"+tf.name+"</td>"
               +"<td>"+tf.count_based_z_score+"</td>"
               +"<td>"+tf.depth_based_z_score+"</td>");
        $(table).append(tr);
      }
    }
    return(table);
  }
  $(this.table_element).on("click", "td.details-control", function () {
    var tr = $(this).closest("tr");
    var row = that.dataTable.row(tr);
    if (row.child.isShown()) {
      row.child.hide();
      tr.removeClass("shown");
    } else {
      var tfs = row.data()["tfs"];
      row.child(child_table(tfs)).show();
      tr.addClass("shown");
    }
  });
}

Herv_list.prototype.update_table = function () {
  var that = this
  function herv_anchor(herv_name) {
    return "<a href='#!basic-info/"+herv_name+"'>"+herv_name+"</a>"
  }
  
  var z_min = Number($("#z_score1").val());
  var hcre = $("#hcre1").prop("checked");
  var mode = $("#z_score_mode")
            .children("input[name=z_score_mode]:checked").val();
  var db = $("#db1").val();
  var specific_tf = $("#tf_select").val();
  function n_tfs(tfs) {
    var res = 0
    for (i in tfs) {
      var tf = tfs[i];
      var tf_db = tf.name.substring(0,2);
      var cond1 = Number(tf[mode]) >= z_min;
      var cond2 = tf.hcre || !hcre;
      var cond3 = (db == "Roadmap|ENCODE") 
        || (db == "Roadmap" && tf_db == "R_") 
        || (db == "ENCODE" && tf_db == "E_");
      if (cond1 && cond2 && cond3) {
        tf.pass = true;
        res += 1
      } else {
        tf.pass = false;
      }
    }
    return(res)
  }
  var table = [];
  for (var herv_name in this.data) {
    table.push({herv_anchor: herv_anchor(herv_name),
                herv_name: herv_name,
                n_tfs: n_tfs(this.data[herv_name]),
                tfs: this.data[herv_name]});
  }
  var filtered_table = table.filter(function (o) {
    var passed_tfs = o.tfs.filter(function (tf) { return(tf.pass) })
                     .map(function(tf) { return(tf.name.substring(2)) });
    var tf = $("#tf_select").val();
    if (!tf) {
      return(true);
    } else { 
      return(passed_tfs.indexOf(tf) >= 0);
    }
  });
  this.dataTable.clear().rows.add(filtered_table).draw();
}
  
function hash_change(e) {
  var hash = location.hash;
  if (hash.substring(0,2) == "#!") {
    var hashpath = hash.substring(2);
    var path1 = hashpath.split("/")[0]
    if (path1 == "basic-info") {
      document.getElementById("basic_info").style.display = "flex";
      document.getElementById("download").style.display = "none";
      document.getElementById("help").style.display = "none";
      var herv_name = hashpath.split("/")[1]
      hash_change_basic_info(herv_name);
    } else if (path1 == "download") {
      document.getElementById("basic_info").style.display = "none";
      document.getElementById("download").style.display = "block";
      document.getElementById("help").style.display = "none";
    } else if (path1 == "help") {
      document.getElementById("basic_info").style.display = "none";
      document.getElementById("download").style.display = "none";
      document.getElementById("help").style.display= "block";
    }
  }
}
window.addEventListener("hashchange", hash_change);

function hash_change_basic_info(herv_name) {
  //set_select_options(herv_name, params);

  var request_info = new XMLHttpRequest();
  request_info.open("GET", "/info/"+herv_name, true);
  request_info.onreadystatechange = function(){
    if (this.readyState == 4 && this.status == 200){
      var json = JSON.parse(this.responseText);
      document.getElementById("herv_family").innerHTML = json["family"];
      document.getElementById("copy_number").innerHTML = json["copy_number"];
      document.getElementById("integration_date").innerHTML = json["integration_data"];
    }
  }
  request_info.send();
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
                     width: "100%",
                     showlegend: true };
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
                         showlegend: true,
                         hovermode: "closest",
                         hoverinfo: "y+name"};
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
                     showlegend: true};
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
                     yaxis: { title: "Proportion" }};
      Plotly.newPlot(div, data, layout);
    }
  }
  request.send();
}

function tree_graph(herv_name, params, div) {
  while (div.firstChild) {
    div.removeChild(div.firstChild);
  }
  var tree_img = document.createElement("img");
  div.appendChild(tree_img);
  tree_img.setAttribute("src", "/image/tree/"+herv_name);
}

function ortholog_graph(herv_name, params, div) {
  var args = create_args_for_tfbs(params);
  while (div.firstChild) {
    div.removeChild(div.firstChild);
  }
  var ortholog_request = new XMLHttpRequest();
  ortholog_request.open("GET", "graph_data/ortholog/"+herv_name+args, true)
  ortholog_request.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var data = JSON.parse(this.responseText);
      var layout = { xaxis: { title: "" },
                     yaxis: { title: "",
                              ticks: "",
                              showticklabels: false },
                     autosize: false,
                     width: 500,
                     height: 590,
                     margin: {l:10,r:80,t:15,b:168}};
      Plotly.newPlot(div, data, layout);
    }
  }
  ortholog_request.send();
}

function tfbs_phylo_graph(herv_name, params, div) {
  var args = create_args_for_tfbs(params);
  while (div.firstChild) {
    div.removeChild(div.firstChild);
  }
  var TFBS_request = new XMLHttpRequest();
  TFBS_request.open("GET", "graph_data/TFBS_phylogeny/"+herv_name+args, true)
  TFBS_request.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var data = JSON.parse(this.responseText);
      var layout = { xaxis: { title: "" },
                     yaxis: { title: "",
                              ticks: "",
                              showticklabels: false },
                     autosize: false,
                     width: 500,
                     height: 590,
                     margin: {l:10,r:80,t:15,b:168}};
      Plotly.newPlot(div, data, layout);
    }
  }
  TFBS_request.send();
}

function motif_phylo_graph(herv_name, params, div) {
  var args = create_args_for_tfbs(params);
  while (div.firstChild) {
    div.removeChild(div.firstChild);
  }
  var motif_request = new XMLHttpRequest();
  motif_request.open("GET", "graph_data/motif_phylogeny/"+herv_name+args, true);
  motif_request.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var data = JSON.parse(this.responseText);
      var layout = { xaxis: { title: "" },
                     yaxis: { title: "",
                              ticks: "",
                              showticklabels: false },
                     autosize: false,
                     width: 750,
                     height: 590,
                     margin: {l:10,r:80,t:15,b:168}};
      Plotly.newPlot(div, data, layout);
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

$("document").ready(function () {
  var graphs = new Graphs([{id: "tfbs_depth_graph", draw: tfbs_depth_graph},
                           {id: "motif_depth_graph", draw: motif_depth_graph},
                           {id: "dhs_depth_graph", draw: dhs_depth_graph},
                           {id: "chromatin_state_graph",
                            draw: chromatin_state_graph},
                           {id: "tree", draw: tree_graph},
                           {id: "ortholog_with_phylo", draw: ortholog_graph},
                           {id: "tfbs_with_phylo", draw: tfbs_phylo_graph},
                           {id: "motif_with_phylo", draw: motif_phylo_graph}]);
  $.getJSON("/all_herv_list", function (data) {
    var herv_list = new Herv_list(data,$("#herv_menu"));
  });
  $.getJSON("/all_tf_list", function (data) {
     $("#tf_select").html(function () {
       var option = document.createElement("OPTION");
       $(option).val("").html("");
       this.append(option);
       for (i in data) {
         var option = document.createElement("OPTION");
         $(option).val(data[i]).html(data[i]);
         this.append(option);
       }
     }).chosen({ placeholder_text_single: "All",
                 allow_single_deselect: true,
                 width: "150px"});
  });
  if  (location.hash.substring(0,2) == "#!") {
    $(window).trigger("hashchange");
  }
  $(".help").tooltip();
});
