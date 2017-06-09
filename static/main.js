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

Graphs.prototype.draw = function() {
  if (this.herv_name) {
    var params = get_params();
    $("#introduction").css("display", "none");
    $("#text_body").css("visivility", "visible");
    $("#text_body").css("display", "block");
    $(".herv_name").html(this.herv_name);
    for (var i=0; i<this.graphs.length; i++) {
      var div = document.getElementById(this.graphs[i].id);
      if (div) this.graphs[i].draw(this.herv_name, params, div);
    }
  }
};

function get_params() {
  var res = [];
  var db_select = document.getElementById("db1");
  res["db1"] = db_select.options[db_select.selectedIndex].value;
  res["hcre1"] = true;
  
  res["z_score_mode"] = $("#z_score_mode")
                        .children("input[name=z_score_mode]:checked").val();
  
  res["z_score1"] = document.getElementById("z_score1").value;
  res["limit1"] = document.getElementById("limit1").value;
  
  var db_select = document.getElementById("db2");
  res["representative"] = document.getElementById("represent").checked;
  res["z_score2"] = document.getElementById("z_score2").value;

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
    order: [[2, "des"]],
    paging: false,
    prosessing: true,
    columns: [{ className: "details-control dt-body-center",
                orderable: false,
                defaultContent: "&rarr;"},
              { title: "HERV",
                data: "herv_anchor",
                type: "natural"},
              { title: "Distribution of Orthologs",
                data: "integration_date"},
              { title: "# TFBS",
                className: "dt-body-right",
                data: "n_tfs"}]
  });
  $("#herv_table").data("herv_list", this);
  this.update_table();
  $("#tfbs_hcre_param").on("change", function(e) { that.update_table();});
  
  function child_table(tfs) {
    var table = document.createElement("TABLE");
    $(table).css("margin", "auto");
    var thead = document.createElement("THEAD");
    var header_row = document.createElement("TR");
    $(header_row)
      .html("<td>TF</td><td>Count based z</td><td>Depth based z</td>"
           +"<td>Depth ratio</td>");
    $(table).append($(thead).append(header_row));
    var mode = $("#z_score_mode")
               .children("input[name=z_score_mode]:checked").val();
    tfs.sort(function (tf1,tf2) {
      return(tf2[mode] - tf1[mode]);
    });
    var selected_tf = $("#tf_select").val();
    for (var i=0; i<tfs.length; i++) {
      var tf = tfs[i];
      if (tf.pass) {
        var tr = document.createElement("TR");
        if (tf.name.substring(2) == selected_tf) {
          $(tr).css("background","antiquewhite");
        }
        $(tr).html("<td>"+tf.name+"</td>"
               +"<td>"+tf.count_based_z_score+"</td>"
               +"<td>"+tf.depth_based_z_score+"</td>"
               +"<td>"+tf.depth_ratio+"</td>");
        $(table).append(tr);
      }
    }
    return(table);
  }
  $(this.table_element).on("click", "td.details-control", function () {
    var tr = $(this).closest("tr");
    var row = that.dataTable.row(tr);
    if (row.child.isShown()) {
      $(this).html("&rarr;");
      row.child.hide();
      tr.removeClass("shown");
    } else {
      $(this).html("&darr;");
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
  
  var use_recalled = $("#recalled").prop("checked");
  var use_unique = $("#unique_reads").prop("checked");
  var z_min = Number($("#z_score1").val());
  var depth_ratio_threshold = Number($("#depth_ratio_threshold").val());
  var mode = $("#z_score_mode")
            .children("input[name=z_score_mode]:checked").val();
  var db = $("#db1").val();
  var specific_tf = $("#tf_select").val();
  function n_tfs(tfs) {
    var res = 0
    for (i in tfs) {
      var tf = tfs[i];
      var tf_db = tf.project;
      var tf_recalled = (tf.recalled == "True");
      var tf_unique = tf.alignment == "unique"
      var cond1 = Number(tf[mode]) >= z_min;
      var cond2 = tf.depth_ratio >= depth_ratio_threshold;
      var cond3 = (db == "Roadmap|ENCODE") || (tf_db == db);
      var cond4 = tf_recalled == use_recalled;
      var cond5 = !use_recalled || tf_unique == use_unique;
      if (cond1 && cond2 && cond3 && cond4 && cond5) {
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
                integration_date: this.data[herv_name].integration_date,
                n_tfs: n_tfs(this.data[herv_name].tfs),
                tfs: this.data[herv_name].tfs});
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
  $(".details-control").css("color", "blue");
}
  
Herv_list.prototype.passed_tfbs = function(herv) {
  var mode = $("#z_score_mode")
            .children("input[name=z_score_mode]:checked").val();
  var tfs = this.data[herv].tfs;
  tfs.sort(function(a,b) {
    return(b[mode] - a[mode]);
  });
  var limit = Number($("#limit1").val());
  var id = [];
  var name = [];
  for (var i=0,n=0; i<tfs.length && n<limit; i++){
    var tf = tfs[i];
    if (tf.pass) {
      name.push(tf.name); 
      id.push(tf.id);
      n++;
    }
  }
  return({name: name, id:id});
}

function hash_change(e) {
  var hash = location.hash;
  if (hash.substring(0,2) == "#!") {
    var hashpath = hash.substring(2);
    var path = hashpath.split("/")[0]
    if (path == "basic-info") {
      document.getElementById("basic_info").style.display = "flex";
      document.getElementById("download").style.display = "none";
      document.getElementById("help").style.display = "none";
      var herv_name = hashpath.split("/")[1]
      hash_change_basic_info(herv_name);
    } else if (path == "download") {
      document.getElementById("basic_info").style.display = "none";
      document.getElementById("download").style.display = "block";
      document.getElementById("help").style.display = "none";
    } else if (path == "help") {
      document.getElementById("basic_info").style.display = "none";
      document.getElementById("download").style.display = "none";
      document.getElementById("help").style.display= "block";
    }
  }
}
$(window).on("hashchange", hash_change);

function hash_change_basic_info(herv_name) {
  set_select_options(herv_name);

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
            "z_score=" + params["z_score2"] + ";";
  return res
}

function id_arg(ids) {
  return("?"+ids.map(function (s) {return("id="+s)}).join(";"))
}

function tfbs_depth_graph(herv_name, params, div) {
  var args = id_arg($("#herv_table").data("herv_list")
                   .passed_tfbs(herv_name).id);
  $.getJSON("graph_data/tfbs_depth_by_id"+args, function (data) {
    var layout = { title: "TFBS Depth",
                   xaxis: { title: "Position (nt)" },
                   yaxis: { title: "HERV-TFBSs (copy)" },
                   width: "100%",
                   showlegend: true };
    Plotly.newPlot(div, data, layout);
  });
}

function motif_depth_graph(herv_name, params, div) {
  var args = id_arg($("#herv_table").data("herv_list")
                   .passed_tfbs(herv_name).id);
  var layout = { title: "Motif Depth",
                 xaxis: { title: "Position (nt)" },
                 yaxis: { title: "TF motif in HERV-TFBSs (copy)" },
                 showlegend: true,
                 hovermode: "closest",
                 hoverinfo: "y+name"};
  Plotly.newPlot(div,[], layout);
  $.getJSON("graph_data/motif_depth_by_id"+args, function (data) {
    Plotly.addTraces(div, data);
  });
  $.getJSON("graph_data/motif_depth_dot_by_id"+args, function (data) {
    Plotly.addTraces(div, data);
  });
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
  var no_image = document.createElement("P");
  no_image.innerHTML = "The phylogenetic tree is not available for this" 
  + " HERV/LTRs because this HERV/LTRs did not fulfill our criteria for"
  + " the tree reconstruction (see our paper).";
  $(no_image).css("color", "red");
  $(tree_img).on("error", function () {
    $(tree_img).hide();
    div.appendChild(no_image);
  })
  tree_img.setAttribute("src", "/image/tree/"+herv_name);
  div.appendChild(tree_img);
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
  while (div.firstChild) {
    div.removeChild(div.firstChild);
  }
  var args = id_arg($("#herv_table").data("herv_list")
                   .passed_tfbs(herv_name).id);
  $.getJSON("graph_data/TFBS_phylogeny_by_id"+args, function (data) {
    var layout = { xaxis: { title: "" },
                   yaxis: { title: "",
                            ticks: "",
                            showticklabels: false },
                   autosize: false,
                   width: 500,
                   height: 590,
                   margin: {l:10,r:80,t:15,b:168}};
    Plotly.newPlot(div, data, layout);
  });
}

function motif_phylo_graph(herv_name, params, div) {
  while (div.firstChild) {
    div.removeChild(div.firstChild);
  }
  var args = id_arg($("#herv_table").data("herv_list")
                   .passed_tfbs(herv_name).id);
  $.getJSON("graph_data/motif_phylogeny_by_id"+args, function (data) {
    var layout = { xaxis: { title: "" },
                   yaxis: { title: "",
                            ticks: "",
                            showticklabels: false },
                   autosize: false,
                   width: 750,
                   height: 590,
                   margin: {l:10,r:80,t:15,b:168}};
    Plotly.newPlot(div, data, layout);
  });
}

function set_select_options(herv_name) {
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
  var tf_list = $("#herv_table").data("herv_list").passed_tfbs(herv_name)
  for (var i=0; i<tf_list.id.length; i++) {
    var tf_name = tf_list.name[i];
    var tf_id = tf_list.id[i]
    var option_1 = document.createElement("option");
    var option_2 = document.createElement("option");
    var option_3 = document.createElement("option");
    option_1.value = tf_id;
    option_2.value = tf_id;
    option_3.value = tf_name;
    option_1.innerHTML = tf_name;
    option_2.innerHTML = tf_name;
    option_3.innerHTML = tf_name;
    tf_select_1.append(option_1);
    tf_select_2.append(option_2);
    tf_select_3.append(option_3);
  }
  
  var all_tf_arg = id_arg($("#herv_table").data("herv_list")
                  .passed_tfbs(herv_name).id);
  if ($("#merge_cell_types").prop("checked")) {
    var merge_arg = ";merge=true";
  } else {
    var merge_arg = ";merge=false";
  }
  
  var a1 = document.getElementById(tf_select_1.getAttribute("anchor_id"));
  a1.setAttribute("href", "/download/herv_tfbs_position_by_id"
                          + all_tf_arg
                          + merge_arg
                          + ";herv_name="+herv_name
                          + ";tf_name=all");
  var a2 = document.getElementById(tf_select_2.getAttribute("anchor_id"));
  a2.setAttribute("href", "/download/hcre_position_by_id"
                          + all_tf_arg
                          + merge_arg
                          + ";herv_name="+herv_name
                          + ";tf_name=all");
  
  var all_tf_name_arg = id_arg($("#herv_table").data("herv_list")
                               .passed_tfbs(herv_name).name);
  var a3 = document.getElementById(tf_select_3.getAttribute("anchor_id"));
  a3.setAttribute("href", "/download/ontology_by_id/"
                          + herv_name
                          + all_tf_name_arg
                          + merge_arg
                          + ";herv_name="+herv_name
                          + ";tf_name=all");

  $(tf_select_1).on("change", function () {
    if ($("#merge_cell_types").prop("checked")) {
      var merge_arg = ";merge=true";
    } else {
      var merge_arg = ";merge=false";
    }
    var tf_id = this.value;
    if (tf_id == "all") {
      var tf_arg = id_arg($("#herv_table").data("herv_list")
                          .passed_tfbs(herv_name).id);
      var tf_name = "all";
    } else {
      var tf_arg = "?id=" + tf_id;
      var tf_name = $(this).find('option:selected').text();
    }
    var anchor = document.getElementById(this.getAttribute("anchor_id"));
    anchor.setAttribute("href",
                        "/download/herv_tfbs_position_by_id"
                        + tf_arg
                        + merge_arg
                        + ";herv_name="+herv_name
                        + ";tf_name="+tf_name);
  });

  $(tf_select_2).on("change", function () {
    if ($("#merge_cell_types").prop("checked")) {
      var merge_arg = ";merge=true";
    } else {
      var merge_arg = ";merge=false";
    }
    var tf_id = this.value;
    if (tf_id == "all") {
      var tf_arg = id_arg($("#herv_table").data("herv_list")
                          .passed_tfbs(herv_name).id);
      var tf_name = "all";
    } else {
      var tf_arg = "?id=" + tf_id;
      var tf_name = $(this).find('option:selected').text();
    }
    var anchor = document.getElementById(this.getAttribute("anchor_id"));
    anchor.setAttribute("href",
                        "/download/hcre_position_by_id"
                        + tf_arg
                        + merge_arg
                        + ";herv_name="+herv_name
                        + ";tf_name="+tf_name);
  });
  
  $(tf_select_3).on("change", function () {
    if ($("#merge_cell_types").prop("checked")) {
      var merge_arg = ";merge=" + "true";
    } else {
      var merge_arg = ";merge=" + "false";
    }
    var tf_id = this.value;
    if (tf_id == "all") {
      var tf_arg = id_arg($("#herv_table").data("herv_list")
                          .passed_tfbs(herv_name).name);
      var tf_name = "all";
    } else {
      var tf_arg = "?id=" + this.value;
      var tf_name = $(this).find('option:selected').text();
    }
    var anchor = document.getElementById(this.getAttribute("anchor_id"));
    anchor.setAttribute("href",
                        "/download/ontology_by_id/"
                        + herv_name
                        + tf_arg
                        + merge_arg
                        + ";herv_name="+herv_name
                        + ";tf_name="+tf_name);
  });

  var hcre_anchor = document.getElementById("dl_hcre");
  hcre_anchor.setAttribute("href", "/download/hcre/"+herv_name);
  
  var dhs_anchor = document.getElementById("dl_dhs_position");
  dhs_anchor.setAttribute("href", "/download/dhs_position/"+herv_name);
}
$("#merge_cell_types, #limit1").on("change", function () {
  var herv_name = location.hash.match(/^#!basic-info\/(.*)/m)[1];
  if (herv_name) {
    set_select_options(herv_name);
  }
});

$("document").ready(function () {
  $.getJSON("/all_herv_list", function (data) {
    var herv_list = new Herv_list(data,$("#herv_menu"));
  })
  .done(function () {
    var graphs = new Graphs([{id: "tfbs_depth_graph", draw: tfbs_depth_graph},
                             {id: "motif_depth_graph", draw: motif_depth_graph},
                             {id: "dhs_depth_graph", draw: dhs_depth_graph},
                             {id: "chromatin_state_graph",
                              draw: chromatin_state_graph},
                             {id: "tree", draw: tree_graph},
                             {id: "ortholog_with_phylo", draw: ortholog_graph},
                             {id: "tfbs_with_phylo", draw: tfbs_phylo_graph},
                             {id: "motif_with_phylo", draw: motif_phylo_graph}])
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
    
    var hcre_threshold_input = $("#depth_ratio_threshold");
    var threshold_slider = $("<div id='threshold_slider'></div>")
                         .insertAfter(hcre_threshold_input)
                         .slider({
      min: 0,
      max: 100,
      range: "max",
      value: Number(hcre_threshold_input.attr("value"))*100,
      slide: function(event, ui) {
        hcre_threshold_input.val((Number(ui.value)*0.01).toFixed(2));
      },
      stop: function(event, ui) {
        $("#herv_table").data("herv_list").update_table();
        graphs.draw();
      }
    });
    threshold_slider.css("width", "80%");
    threshold_slider.css("margin-bottom", "10px");
    hcre_threshold_input.on("change", function() {
      threshold_slider.slider("value", Number($(this).val())*100);
    });

    if  (location.hash.substring(0,2) == "#!") {
      $(window).trigger("hashchange");
    }
    $(".help").tooltip();
  });
});
