#!/usr/bin/env python

from twisted.web.static import File
from klein import Klein
app = Klein()

main_html = "".join(list(open("main.html")))
main_js = "".join(list(open("main.js")))
plotly = "".join(list(open("plotly.min.js")))

herv_list_json = "".join(list(open("herv_list.json")))

@app.route("/")
def pg_main(request):
  return main_html

@app.route("/main.js")
def js_main(request):
  return main_js

@app.route("/plotly.min.js")
def js_plotly(request):
  return plotly

@app.route("/herv_list")
def herv_list(request):
  return herv_list_json

@app.route("/graph_data/tfbs_depth/<herv_name>")
def tbfs_depth(request, herv_name):
  f = open("./graph_data/tf_depth/"+herv_name+".json")
  return "".join(list(f))

@app.route("/graph_data/motif_depth/<herv_name>")
def motif_depth(request, herv_name):
  f = open("./graph_data/motif_depth/"+herv_name+".json")
  return "".join(list(f))

app.run("ilabws03.lab.nig.ac.jp", 8080)
