var main_div = document.getElementById("main");

function get_herv_list(element) {
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
      element.appendChild(ul);
    }
  }
  request.send()
}

function tfbs_depth_graph(herv_name, element) {
  var request = new XMLHttpRequest()
  request.open("GET", "graph_data/tfbs_depth/"+herv_name, true)
  var div = document.createElement("div");
  div.setAttribute("id", "tfbs_depth_graph:"+herv_name);
  element.appendChild(div);
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

get_herv_list(main_div);
tfbs_depth_graph("LTR5_Hs", main_div);
